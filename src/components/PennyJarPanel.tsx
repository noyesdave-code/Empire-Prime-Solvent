// Admin-only Penny Jar dashboard — shows live balance, source breakdown,
// recent drops, and a withdraw button (links to Paddle payouts).
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Wallet, RefreshCw, ExternalLink } from "lucide-react";

type Row = {
  id: string;
  cents: number;
  source: string;
  note: string | null;
  tipper_email: string | null;
  created_at: string;
};

const fmt = (cents: number) =>
  `$${(cents / 100).toFixed(2)}`;

export function PennyJarPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("penny_jar_ledger")
      .select("id, cents, source, note, tipper_email, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(50);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const total = rows.reduce((s, r) => s + (r.cents ?? 0), 0);
  const pennies = Math.round(total); // cents == pennies
  const bySource = rows.reduce((acc: Record<string, number>, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + r.cents;
    return acc;
  }, {});

  return (
    <Card className="p-4 border-primary/40">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" />
          <div>
            <div className="font-bold">Ani's Penny Jar</div>
            <div className="text-[11px] text-muted-foreground">
              Real money. Tips drop here via the homepage button. Withdraw any time.
            </div>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="rounded border bg-muted/30 p-4 text-center">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Jar balance</div>
        <div className="text-4xl font-black my-1">{fmt(total)}</div>
        <div className="text-xs text-muted-foreground">
          {pennies.toLocaleString()} pennies · {rows.length} drop{rows.length === 1 ? "" : "s"} (last 50)
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs mt-3">
        {Object.entries(bySource).map(([src, c]) => (
          <div key={src} className="rounded border p-2 flex justify-between">
            <span className="uppercase tracking-wider text-muted-foreground">{src}</span>
            <span className="font-bold">{fmt(c)}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-4">
        <Button
          asChild
          size="sm"
          className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
          disabled={total === 0}
        >
          <a href="https://vendors.paddle.com/payouts" target="_blank" rel="noreferrer">
            <Wallet className="h-4 w-4 mr-1" />
            Withdraw to bank
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
        <div className="text-[10px] text-muted-foreground self-center">
          Payouts: Paddle holds funds ~14 days, then auto-pays to your bank monthly.
        </div>
      </div>

      <div className="mt-4">
        <div className="text-xs font-bold mb-1">Recent drops</div>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {rows.length === 0 && (
            <div className="text-xs text-muted-foreground italic">Jar's empty. First penny goes here when someone tips Ani.</div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="flex justify-between text-xs border-b py-1">
              <div className="truncate">
                <span className="font-mono font-bold text-primary mr-2">{fmt(r.cents)}</span>
                <span className="text-muted-foreground">{r.tipper_email ?? r.source}</span>
              </div>
              <div className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
