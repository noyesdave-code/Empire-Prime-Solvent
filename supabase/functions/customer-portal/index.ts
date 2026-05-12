import { createClient } from 'npm:@supabase/supabase-js@2';
import { getPaddleClient, type PaddleEnv } from '../_shared/paddle.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: sub } = await admin
      .from('subscriptions')
      .select('paddle_customer_id, paddle_subscription_id, environment')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) throw new Error('No subscription found');

    const env = sub.environment as PaddleEnv;
    const paddle = getPaddleClient(env);
    const portal = await paddle.customerPortalSessions.create(sub.paddle_customer_id as string, [sub.paddle_subscription_id as string]);

    return new Response(JSON.stringify({ url: portal.urls.general.overview }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('customer-portal error:', e);
    const msg = e instanceof Error && (e.message === 'Not authenticated' || e.message === 'No subscription found')
      ? e.message
      : 'Unable to open portal. Please try again.';
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
