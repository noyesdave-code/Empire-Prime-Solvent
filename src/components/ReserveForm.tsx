import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { trackFunnelEvent, getAttribution } from "@/lib/funnelTracking";

/**
 * Shared zero-cost capture form. Uses the existing `funnel_leads` table
 * (no schema changes) + funnel_events tracking. Used for:
 *  - PYRON pre-orders   (mode="reserve",  stage="preorder")
 *  - Concept waitlists  (mode="waitlist", stage="waitlist")
 */
export function ReserveForm({
  product,
  stage = "preorder",
  mode = "reserve",
  cta,
  helper,
  redirectTo,
}: {
  product: string;
  stage?: "preorder" | "waitlist";
  mode?: "reserve" | "waitlist";
  cta?: string;
  helper?: string;
  redirectTo?: string;
}) {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!/.+@.+\..+/.test(email)) { setErr("Enter a valid email."); return; }
    setBusy(true);
    try {
      const attribution = getAttribution();
      const { error } = await supabase.from("funnel_leads").insert({
        email: email.trim().toLowerCase(),
        source: mode === "reserve" ? "preorder_form" : "waitlist_form",
        stage,
        product_interest: product,
        metadata: { mode, attribution },
      });
      if (error) throw error;
      await trackFunnelEvent({
        event_type: "lead",
        stage,
        product,
        metadata: { mode },
      });
      setDone(true);
      if (redirectTo) {
        setTimeout(() => nav(redirectTo), 600);
      }
    } catch (e2: any) {
      setErr(e2?.message || "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-sm text-foreground flex items-start gap-2">
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <p className="font-bold">
            {mode === "reserve" ? "You're on the build list." : "You're on the waitlist."}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            We'll email <span className="text-foreground">{email}</span> the moment {product.toUpperCase()} unlocks.
            No charge today.
          </p>
        </div>
      </div>
    );
  }

  const buttonLabel = cta || (mode === "reserve" ? "Reserve my unit · Free" : "Join the waitlist · Free");

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          maxLength={200}
          required
          className="h-11 text-base flex-1"
        />
        <Button type="submit" disabled={busy} className="h-11 px-4 font-bold">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
          {busy ? "Saving…" : buttonLabel}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {helper || "No card needed. We email you when production starts. Unsubscribe anytime."}
      </p>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </form>
  );
}
