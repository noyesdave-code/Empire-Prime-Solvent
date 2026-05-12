import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Live unlock bar. Counts funnel_leads rows for a given product_interest
 * and shows progress toward the next-build threshold. Read-only, public.
 *
 * Default: PYRON Step 4, target 100 reservations to unlock Step 5.
 */
export function EmpireProgress({
  product = "pyron",
  step = 4,
  nextLabel = "Step 5 · SHELF LIFE",
  target = 100,
  compact = false,
}: {
  product?: string;
  step?: number;
  nextLabel?: string;
  target?: number;
  compact?: boolean;
}) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { count } = await supabase
        .from("funnel_leads")
        .select("id", { count: "exact", head: true })
        .eq("product_interest", product);
      if (!cancelled) setCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [product]);

  const value = count ?? 0;
  const pct = Math.min(100, Math.round((value / target) * 100));

  return (
    <div className={`rounded-xl border border-primary/30 bg-primary/5 ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <p className="text-[10px] uppercase tracking-widest text-fluoro-gold">
          Empire Progress · Step {step} unlock
        </p>
        <p className="text-xs font-mono text-foreground">
          {value} / {target} reservations
        </p>
      </div>
      <div className="mt-2 h-2 w-full rounded-full bg-background overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700"
          style={{ width: `${pct}%`, boxShadow: "0 0 12px hsl(var(--primary))" }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Hit {target} pre-orders → {nextLabel} unlocks. Every reservation is free and funds the next build.
      </p>
    </div>
  );
}
