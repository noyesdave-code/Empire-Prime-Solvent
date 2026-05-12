import { corsHeaders, runSwarm, sendEmail } from "../_shared/swarm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("abandoned-cart", async (db) => {
    // Sessions that entered email 24h+ ago but never paid.
    const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: opens } = await db
      .from("funnel_events")
      .select("session_id, product, metadata, created_at")
      .eq("event_type", "email_entered")
      .lt("created_at", cutoff)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
      .limit(200);
    let sent = 0, skipped = 0;
    for (const o of opens ?? []) {
      const email = (o.metadata as { email?: string })?.email;
      if (!email) { skipped++; continue; }
      // Already paid?
      const { count: paid } = await db
        .from("funnel_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "checkout_paid")
        .filter("metadata->>email", "eq", email);
      if ((paid ?? 0) > 0) { skipped++; continue; }
      // Already recovered/sent?
      const { count: prior } = await db
        .from("abandoned_carts")
        .select("id", { count: "exact", head: true })
        .eq("email", email)
        .eq("session_id", o.session_id ?? "");
      if ((prior ?? 0) > 0) { skipped++; continue; }
      const tier = (o.metadata as { tier?: string })?.tier ?? "Founder";
      const html = `<div style="font-family:system-ui;max-width:560px;margin:auto">
        <h2 style="color:#0aa6a0">Your Unicorn Box is still waiting</h2>
        <p>You started a <b>${o.product ?? "build"}</b> at the <b>${tier}</b> tier. Use code <b>UNICORN10</b> for 10% off in the next 48 hours.</p>
        <p><a href="https://unicornaibuilder.lovable.app/p/${o.product ?? ""}" style="color:#0aa6a0">Finish checkout →</a></p>
        <p style="color:#666;font-size:12px">PGVA Ventures LLC · Reply STOP to opt out.</p>
      </div>`;
      const r = await sendEmail(email, "10% off — finish your Unicorn Box build", html);
      await db.from("abandoned_carts").insert({
        email, product: o.product, tier, session_id: o.session_id,
        opened_at: o.created_at,
        recovery_sent_at: r.ok ? new Date().toISOString() : null,
        metadata: { code: "UNICORN10", error: r.error ?? null },
      });
      if (r.ok) sent++;
    }
    return { candidates: opens?.length ?? 0, sent, skipped };
  }, req);
});
