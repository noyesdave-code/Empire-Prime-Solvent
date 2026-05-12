import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Loader2, Play, ArrowLeft } from "lucide-react";

const SWARMS = [
  { fn: "swarm-outreach",       label: "Outreach",          schedule: "Daily 09:00 UTC" },
  { fn: "swarm-seo-content",    label: "SEO Content",       schedule: "Daily 03:00 UTC" },
  { fn: "swarm-defense-intel",  label: "Defense Intel",     schedule: "Daily 06:00 UTC" },
  { fn: "swarm-abandoned-cart", label: "Abandoned Cart",    schedule: "Every 4 hours" },
  { fn: "swarm-brand-defense",  label: "Brand Defense",     schedule: "Daily 12:00 UTC" },
  { fn: "swarm-pricing",        label: "Competitor Pricing", schedule: "Weekly Mon 02:00 UTC" },
];

type Run = { id: string; swarm_name: string; status: string; started_at: string; finished_at: string | null; stats: Record<string, unknown>; error: string | null };

export default function BoardroomSwarms() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [counts, setCounts] = useState({ outreach: 0, alerts: 0, prices: 0, carts: 0, drafts: 0 });
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const ok = !!roles?.some((r) => r.role === "admin");
      setIsAdmin(ok);
      if (!ok) { navigate("/"); return; }
      await refresh();
    })();
  }, [user, loading, navigate]);

  async function refresh() {
    const [r, o, b, p, c, d] = await Promise.all([
      supabase.from("swarm_runs").select("*").order("started_at", { ascending: false }).limit(40),
      supabase.from("outreach_targets").select("id", { count: "exact", head: true }),
      supabase.from("brand_alerts").select("id", { count: "exact", head: true }),
      supabase.from("pricing_snapshots").select("id", { count: "exact", head: true }),
      supabase.from("abandoned_carts").select("id", { count: "exact", head: true }),
      supabase.from("seo_drafts").select("id", { count: "exact", head: true }),
    ]);
    setRuns((r.data ?? []) as Run[]);
    setCounts({ outreach: o.count ?? 0, alerts: b.count ?? 0, prices: p.count ?? 0, carts: c.count ?? 0, drafts: d.count ?? 0 });
  }

  async function runNow(fn: string) {
    setRunning(fn);
    try {
      const { error } = await supabase.functions.invoke(fn, { body: {} });
      if (error) throw error;
      toast.success(`${fn} finished`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setRunning(null);
    }
  }

  if (loading || isAdmin === null) return <div className="min-h-screen bg-background grid place-items-center text-fluoro">Loading…</div>;
  if (!isAdmin) return null;

  const last = (fn: string) => runs.find((r) => r.swarm_name === fn.replace("swarm-", ""));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/boardroom" className="inline-flex items-center gap-2 text-sm text-fluoro-gold hover:underline">
            <ArrowLeft className="h-4 w-4" /> Boardroom
          </Link>
          <h1 className="text-2xl font-black text-flagship-emerald">Swarms</h1>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <Card className="p-3 bg-card text-center"><p className="text-[10px] uppercase text-fluoro-gold">Outreach</p><p className="text-2xl font-black text-flagship-emerald">{counts.outreach}</p></Card>
          <Card className="p-3 bg-card text-center"><p className="text-[10px] uppercase text-fluoro-gold">Brand alerts</p><p className="text-2xl font-black text-flagship-emerald">{counts.alerts}</p></Card>
          <Card className="p-3 bg-card text-center"><p className="text-[10px] uppercase text-fluoro-gold">Price snapshots</p><p className="text-2xl font-black text-flagship-emerald">{counts.prices}</p></Card>
          <Card className="p-3 bg-card text-center"><p className="text-[10px] uppercase text-fluoro-gold">Carts</p><p className="text-2xl font-black text-flagship-emerald">{counts.carts}</p></Card>
          <Card className="p-3 bg-card text-center"><p className="text-[10px] uppercase text-fluoro-gold">SEO drafts</p><p className="text-2xl font-black text-flagship-emerald">{counts.drafts}</p></Card>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {SWARMS.map((s) => {
            const l = last(s.fn);
            return (
              <Card key={s.fn} className="p-4 bg-card border-2 border-primary/40">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-bold text-flagship-emerald">{s.label}</p>
                    <p className="text-[10px] uppercase text-fluoro-gold">{s.schedule}</p>
                  </div>
                  <Button size="sm" disabled={running === s.fn} onClick={() => runNow(s.fn)}>
                    {running === s.fn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                    Run now
                  </Button>
                </div>
                {l ? (
                  <div className="mt-3 text-xs text-fluoro/80 space-y-1">
                    <p>Last run: <span className={l.status === "ok" ? "text-flagship-emerald" : "text-flagship-maroon"}>{l.status}</span> · {new Date(l.started_at).toLocaleString()}</p>
                    {l.error ? <p className="text-flagship-maroon break-all">{l.error}</p> : <pre className="text-[10px] bg-background/60 p-2 rounded overflow-x-auto">{JSON.stringify(l.stats, null, 0)}</pre>}
                  </div>
                ) : <p className="mt-3 text-xs text-fluoro/60">No runs yet.</p>}
              </Card>
            );
          })}
        </div>

        <h2 className="mt-8 mb-3 text-sm uppercase tracking-widest text-fluoro-gold">Recent runs</h2>
        <Card className="p-3 bg-card text-xs">
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {runs.map((r) => (
              <div key={r.id} className="flex justify-between gap-2 border-b border-border/40 py-1">
                <span className="text-fluoro">{r.swarm_name}</span>
                <span className={r.status === "ok" ? "text-flagship-emerald" : r.status === "error" ? "text-flagship-maroon" : "text-fluoro-gold"}>{r.status}</span>
                <span className="text-fluoro/60">{new Date(r.started_at).toLocaleString()}</span>
              </div>
            ))}
            {runs.length === 0 && <p className="text-fluoro/60">No runs yet — hit "Run now" on any swarm.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
