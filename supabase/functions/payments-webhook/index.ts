import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyWebhook, EventName, type PaddleEnv } from '../_shared/paddle.ts';

// Map product external_id -> human tier label
const TIER_MAP: Record<string, string> = {
  unicorn_sparks: 'sparks',
  unicorn_pony: 'pony',
  unicorn_stallion: 'stallion',
  unicorn_founder: 'founder',
  unicorn_pro: 'pro',
  unicorn_agency: 'agency',
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
  }
  return _supabase;
}

async function syncProfileTier(userId: string, productExternalId: string | null) {
  const tier = productExternalId ? (TIER_MAP[productExternalId] ?? 'free') : 'free';
  await getSupabase().from('profiles').update({ tier, updated_at: new Date().toISOString() }).eq('user_id', userId);
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;
  const userId = customData?.userId;
  if (!userId) { console.error('No userId in customData'); return; }

  const item = items[0];
  const priceId = item.price.importMeta?.externalId;
  const productId = item.product.importMeta?.externalId;
  if (!priceId || !productId) {
    console.warn('Skipping subscription: missing importMeta.externalId', { rawPriceId: item.price.id, rawProductId: item.product.id });
    return;
  }

  await getSupabase().from('subscriptions').upsert({
    user_id: userId,
    paddle_subscription_id: id,
    paddle_customer_id: customerId,
    product_id: productId,
    price_id: priceId,
    status,
    current_period_start: currentBillingPeriod?.startsAt,
    current_period_end: currentBillingPeriod?.endsAt,
    environment: env,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'paddle_subscription_id' });

  await syncProfileTier(userId, productId);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { id, status, currentBillingPeriod, scheduledChange, items } = data;

  await getSupabase().from('subscriptions')
    .update({
      status,
      current_period_start: currentBillingPeriod?.startsAt,
      current_period_end: currentBillingPeriod?.endsAt,
      cancel_at_period_end: scheduledChange?.action === 'cancel',
      updated_at: new Date().toISOString(),
    })
    .eq('paddle_subscription_id', id)
    .eq('environment', env);

  const productId = items?.[0]?.product?.importMeta?.externalId;
  if (productId) {
    const { data: row } = await getSupabase().from('subscriptions').select('user_id').eq('paddle_subscription_id', id).maybeSingle();
    if (row?.user_id) await syncProfileTier(row.user_id as string, productId);
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase().from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('paddle_subscription_id', data.id)
    .eq('environment', env);
  // Do NOT downgrade tier yet — user keeps access until period_end (per business rules)
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // Server-side automation for one-time product checkouts. Logs the paid event
  // into funnel_events AND, for physical product checkouts, creates an order
  // row and routes it through fulfill-order (Printful auto-ship for POD,
  // manual queue for everything else).
  try {
    const customData = data?.customData ?? {};
    const intent = customData.intent;
    if (intent !== 'product_checkout' && !customData.fleet_id && !customData.tier) return;

    const sb = getSupabase();

    // Physical product orders → orders table → fulfill-order
    if (intent === 'product_checkout' && customData.fleet_id) {
      const sku = customData.fleet_id as string;
      const { data: src } = await sb.from('product_sourcing').select('id, name').eq('sku', sku).maybeSingle();
      if (src) {
        const totals = data?.details?.totals ?? data?.totals ?? {};
        const amount = Number(totals.total ?? totals.grandTotal ?? 0) || 0;
        const ship = data?.address ?? data?.customer?.address ?? null;
        const email = data?.customer?.email ?? customData.email ?? '';

        const { data: order } = await sb.from('orders').insert({
          paddle_order_id: data?.id ?? null,
          email,
          product_id: sku,
          sku,
          amount_cents: amount,
          currency: data?.currencyCode ?? 'USD',
          shipping_address: ship,
          environment: env,
          metadata: { tier: customData.tier ?? null, transaction_id: data?.id ?? null },
        }).select('id').single();

        if (order?.id) {
          // Fire-and-forget — fulfill-order writes back to orders + queue
          await sb.functions.invoke('fulfill-order', { body: { order_id: order.id } });
        }
      }
    }

    await sb.from('funnel_events').insert({
      event_type: 'checkout_paid',
      stage: 'webhook',
      product: customData.fleet_id ?? null,
      ab_cta_variant: null,
      session_id: null,
      metadata: {
        environment: env,
        tier: customData.tier ?? null,
        product_name: customData.product_name ?? null,
        transaction_id: data?.id ?? null,
        customer_id: data?.customerId ?? null,
        attribution: {
          utm_source: customData.utm_source ?? null,
          utm_medium: customData.utm_medium ?? null,
          utm_campaign: customData.utm_campaign ?? null,
          utm_content: customData.utm_content ?? null,
          utm_term: customData.utm_term ?? null,
          referrer: customData.referrer ?? null,
        },
      },
    });
  } catch (e) {
    console.error('handleTransactionCompleted error', e);
  }
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);
  console.log('Webhook event:', event.eventType, 'env:', env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
      await handleSubscriptionCreated(event.data, env); break;
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpdated(event.data, env); break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env); break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env); break;
    default:
      console.log('Unhandled event:', event.eventType);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  const env = (url.searchParams.get('env') || 'sandbox') as PaddleEnv;
  try {
    await handleWebhook(req, env);
    return new Response(JSON.stringify({ received: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('Webhook error:', e);
    return new Response('Webhook error', { status: 400 });
  }
});
