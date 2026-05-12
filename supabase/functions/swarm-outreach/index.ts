import { corsHeaders, runSwarm, sendEmail } from "../_shared/swarm.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  return runSwarm("outreach", async (db) => {
    // Pull funnel_leads from last 24h whose email never reached checkout_paid.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: leads } = await db
      .from("funnel_leads")
      .select("email, product_interest, source, created_at")
      .gte("created_at", since)
      .limit(50);
    let queued = 0, sent = 0, skipped = 0;
    for (const l of leads ?? []) {
      // Skip if already paid
      const { count: paid } = await db
        .from("funnel_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "checkout_paid")
        .filter("metadata->>email", "eq", l.email);
      if ((paid ?? 0) > 0) { skipped++; continue; }
      // Upsert into outreach_targets
      await db.from("outreach_targets").upsert({
        email: l.email,
        source: l.source,
        product_interest: l.product_interest,
        status: "queued",
        metadata: { lead_at: l.created_at },
      }, { onConflict: "email" });
      queued++;
      // Send if Resend keys are present
      const html = `<div style="font-family:system-ui;max-width:560px;margin:auto">
        <h2 style="color:#0aa6a0">Still building your launch?</h2>
        <p>Hi — Dave at Unicorn Box. You looked at <b>${l.product_interest ?? "a fleet product"}</b> yesterday but didn't finish.</p>
        <p>If price was the blocker, reply with the product name and I'll send a custom build estimate within 24h.</p>
        <p><a href="https://unicornaibuilder.lovable.app/funnel" style="color:#0aa6a0">Pick up where you left off →</a></p>
        <p style="color:#666;font-size:12px">PGVA Ventures LLC · Unicorn Box™ · Reply STOP to opt out.</p>
      </div>`;
      const r = await sendEmail(l.email, "One question about your Unicorn Box build", html);
      if (r.ok) {
        sent++;
        await db.from("outreach_targets").update({
          status: "sent", last_sent_at: new Date().toISOString(),
        }).eq("email", l.email);
      }
    }
    return { leads_seen: leads?.length ?? 0, queued, sent, skipped };
  }, req);
});
