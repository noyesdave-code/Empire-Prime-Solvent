// Routes a paid order: POD products auto-forward to Printful, everything else
// goes into the manual fulfillment queue for the admin to ship.
// Called by payments-webhook on order.completed (or invoke directly for backfill).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // AuthZ: require service_role (webhook) or an admin user.
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const isService = token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!isService) {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (claims.claims.role !== "service_role") {
      const { data: roles } = await db.from("user_roles").select("role").eq("user_id", claims.claims.sub);
      if (!roles?.some((r: { role: string }) => r.role === "admin")) {
        return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }
  }

  try {
    const { order_id } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const { data: order, error } = await db.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (error || !order) throw new Error("order not found");

    // Look up sourcing row
    const { data: src } = await db.from("product_sourcing").select("*").eq("sku", order.sku ?? order.product_id).maybeSingle();

    const isPod = !!src?.is_pod && !!src?.printful_variant_id;
    const route = isPod ? "printful" : "manual";

    // Insert queue row
    const { data: queued } = await db.from("fulfillment_queue").insert({
      order_id, route, status: route === "printful" ? "submitting" : "queued",
    }).select("id").single();

    let printfulOrderId: string | null = null;
    let lastError: string | null = null;

    if (route === "printful") {
      const key = Deno.env.get("PRINTFUL_API_KEY");
      const ship = order.shipping_address as Record<string, string> | null;
      if (!key) {
        lastError = "PRINTFUL_API_KEY missing";
      } else if (!ship?.address1 || !ship?.city || !ship?.country_code) {
        lastError = "shipping_address incomplete";
      } else {
        try {
          const r = await fetch("https://api.printful.com/orders", {
            method: "POST",
            headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              recipient: {
                name: ship.name ?? order.email,
                address1: ship.address1, address2: ship.address2 ?? "",
                city: ship.city, state_code: ship.state_code ?? "",
                country_code: ship.country_code, zip: ship.zip ?? "",
                email: order.email,
              },
              items: [{ variant_id: Number(src!.printful_variant_id), quantity: 1 }],
              confirm: false, // draft - confirm manually until Dave is ready
            }),
          });
          const j = await r.json();
          if (!r.ok) lastError = `printful ${r.status}: ${JSON.stringify(j).slice(0,300)}`;
          else printfulOrderId = String(j?.result?.id ?? "");
        } catch (e) {
          lastError = e instanceof Error ? e.message : String(e);
        }
      }

      await db.from("fulfillment_queue").update({
        status: lastError ? "error" : "submitted",
        printful_order_id: printfulOrderId,
        last_error: lastError,
        attempts: 1,
      }).eq("id", queued!.id);
    }

    await db.from("orders").update({
      fulfillment_status: route === "manual" ? "manual_queue" :
        lastError ? "printful_error" : "printful_draft",
    }).eq("id", order_id);

    return new Response(JSON.stringify({ ok: !lastError, route, printfulOrderId, error: lastError }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
