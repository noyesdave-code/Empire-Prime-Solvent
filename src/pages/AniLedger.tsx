import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNoIndex } from "@/hooks/useNoIndex";

type Row = {
  id: string;
  user_id: string | null;
  provider: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  est_cost_usd: number;
  latency_ms: number | null;
  success: boolean;
  created_at: string;
};

export default function AniLedger() {
  useNoIndex();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      setIsAdmin(!!roles?.some((r: any) => r.role === "admin"));
      const { data } = await supabase.from("ani_usage_ledger").select("*").order("created_at", { ascending: false }).limit(200);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const totals = rows.reduce((acc, r) => {
    acc.calls += 1;
    acc.tokensIn += r.tokens_in;
    acc.tokensOut += r.tokens_out;
    acc.cost += Number(r.est_cost_usd);
    acc.byProvider[r.provider] = (acc.byProvider[r.provider] ?? 0) + Number(r.est_cost_usd);
    return acc;
  }, { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0, byProvider: {} as Record<string, number> });

  const exportCsv = () => {
    const header = "created_at,provider,model,tokens_in,tokens_out,est_cost_usd,latency_ms,success\n";
    const body = rows.map(r => `${r.created_at},${r.provider},${r.model},${r.tokens_in},${r.tokens_out},${r.est_cost_usd},${r.latency_ms ?? ""},${r.success}`).join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `ani-ledger-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/boardroom/ani-provider" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><ChevronLeft className="h-4 w-4" /> Provider</Link>
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Ani · Usage Ledger</h1>
            <p className="text-white/60 mt-1 text-sm">{isAdmin ? "All users (admin view)" : "Your usage"}</p>
          </div>
          <Button onClick={exportCsv} variant="outline" className="border-white/20"><Download className="h-4 w-4 mr-2" /> CSV</Button>
        </header>

        <div className="grid sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-white/10 p-4"><div className="text-xs uppercase text-white/40">Calls</div><div className="text-2xl font-semibold">{totals.calls}</div></div>
          <div className="rounded-lg border border-white/10 p-4"><div className="text-xs uppercase text-white/40">Tokens in</div><div className="text-2xl font-semibold">{totals.tokensIn.toLocaleString()}</div></div>
          <div className="rounded-lg border border-white/10 p-4"><div className="text-xs uppercase text-white/40">Tokens out</div><div className="text-2xl font-semibold">{totals.tokensOut.toLocaleString()}</div></div>
          <div className="rounded-lg border border-white/10 p-4"><div className="text-xs uppercase text-white/40">Est. cost</div><div className="text-2xl font-semibold">${totals.cost.toFixed(4)}</div></div>
        </div>

        <div className="rounded-lg border border-white/10 p-4">
          <div className="text-xs uppercase text-white/40 mb-2">Cost by provider</div>
          {Object.entries(totals.byProvider).map(([p, c]) => (
            <div key={p} className="flex justify-between py-1 text-sm"><span>{p}</span><span className="font-mono">${c.toFixed(4)}</span></div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs uppercase">
              <tr><th className="text-left p-2">When</th><th className="text-left p-2">Provider</th><th className="text-left p-2">Model</th><th className="text-right p-2">In</th><th className="text-right p-2">Out</th><th className="text-right p-2">Cost</th><th className="text-right p-2">ms</th></tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-white/5">
                  <td className="p-2 text-white/70">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.provider}</td>
                  <td className="p-2 font-mono text-xs">{r.model}</td>
                  <td className="p-2 text-right">{r.tokens_in}</td>
                  <td className="p-2 text-right">{r.tokens_out}</td>
                  <td className="p-2 text-right font-mono">${Number(r.est_cost_usd).toFixed(5)}</td>
                  <td className="p-2 text-right">{r.latency_ms ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-white/40">No ledger entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
