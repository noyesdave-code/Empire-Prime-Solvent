import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/sonner";
import { Brain, Check, X, RefreshCw, ExternalLink, ChevronLeft, TrendingUp } from "lucide-react";

type Draft = {
  id: string;
  title: string;
  summary: string;
  sources: string[];
  source_pattern: string | null;
  status: string;
  model_used: string | null;
  created_at: string;
};

type DailyPoint = { day: string; learnings: number; drafts: number; brain: number };

export default function BoardroomResearch() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [growth, setGrowth] = useState<DailyPoint[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [totals, setTotals] = useState({ brain: 0, learnings: 0, pending: 0, approved: 0 });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = !!data?.some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) navigate("/boardroom");
    })();
  }, [user, loading, navigate]);

  async function load() {
    setBusy(true);
    const [{ data: d }, { count: brainCount }, { count: learnCount }, { count: pending }, { count: approved }] = await Promise.all([
      supabase.from("web_research").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("empire_brain").select("id", { count: "exact", head: true }),
      supabase.from("empire_learnings").select("id", { count: "exact", head: true }),
      supabase.from("web_research").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("web_research").select("id", { count: "exact", head: true }).eq("status", "approved"),
    ]);
    setDrafts((d ?? []) as Draft[]);
    setTotals({ brain: brainCount ?? 0, learnings: learnCount ?? 0, pending: pending ?? 0, approved: approved ?? 0 });

    // 14-day growth series
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const [lr, dr, br] = await Promise.all([
      supabase.from("empire_learnings").select("created_at").gte("created_at", since),
      supabase.from("web_research").select("created_at").gte("created_at", since),
      supabase.from("empire_brain").select("created_at").gte("created_at", since),
    ]);
    const buckets: Record<string, DailyPoint> = {};
    for (let i = 13; i >= 0; i--) {
      const day = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      buckets[day] = { day, learnings: 0, drafts: 0, brain: 0 };
    }
    (lr.data ?? []).forEach((r: any) => { const k = r.created_at.slice(0,10); if (buckets[k]) buckets[k].learnings++; });
    (dr.data ?? []).forEach((r: any) => { const k = r.created_at.slice(0,10); if (buckets[k]) buckets[k].drafts++; });
    (br.data ?? []).forEach((r: any) => { const k = r.created_at.slice(0,10); if (buckets[k]) buckets[k].brain++; });
    setGrowth(Object.values(buckets));
    setBusy(false);
  }

  useEffect(() => { if (isAdmin) load(); }, [isAdmin]);

  const todayGrowthPct = useMemo(() => {
    if (growth.length < 2) return 0;
    const today = growth[growth.length - 1];
    const prior7 = growth.slice(-8, -1);
    const avg = prior7.reduce((s, p) => s + p.learnings + p.drafts + p.brain, 0) / Math.max(1, prior7.length);
    const todayTotal = today.learnings + today.drafts + today.brain;
    if (avg === 0) return todayTotal > 0 ? 100 : 0;
    return Math.round(((todayTotal - avg) / avg) * 100);
  }, [growth]);

  async function approve(d: Draft) {
    const slug = (d.title || "entry").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80) + "-" + d.id.slice(0, 6);
    const sourceList = (d.sources ?? []).slice(0, 5).map((s, i) => `[${i + 1}] ${s}`).join("\n");
    const content = `${d.summary}\n\nSources:\n${sourceList}`.slice(0, 4000);
    const { error: brainErr } = await supabase.from("empire_brain").insert({
      slug, title: d.title.slice(0, 200), content, tags: ["self-research", d.model_used ?? "perplexity"], priority: 80, active: true,
    });
    if (brainErr) { toast.error(brainErr.message); return; }
    await supabase.from("web_research").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq("id", d.id);
    toast.success("Promoted to Empire Brain");
    load();
  }

  async function reject(d: Draft) {
    await supabase.from("web_research").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq("id", d.id);
    toast.success("Rejected");
    load();
  }

  async function runNow() {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-research", { body: { trigger: "manual" } });
      if (error) throw error;
      toast.success(`Considered ${data?.considered ?? 0}, drafted ${data?.drafted?.length ?? 0}`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Research run failed");
    }
    setRunning(false);
  }

  if (loading || isAdmin === null) return <div className="min-h-screen bg-background" />;
  if (!isAdmin) return null;

  const maxBar = Math.max(1, ...growth.map(g => g.learnings + g.drafts + g.brain));
  const pending = drafts.filter(d => d.status === "pending");
  const reviewed = drafts.filter(d => d.status !== "pending").slice(0, 20);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/boardroom" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Boardroom
          </Link>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h1 className="font-mono text-sm uppercase tracking-widest">Self-Research</h1>
          </div>
          <Button size="sm" variant="outline" onClick={runNow} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-1 ${running ? "animate-spin" : ""}`} />
            Run now
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        {/* Growth metrics */}
        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Daily growth</h2>
            </div>
            <div className="text-2xl font-mono">
              <span className={todayGrowthPct >= 0 ? "text-fluoro-gold" : "text-destructive"}>
                {todayGrowthPct >= 0 ? "+" : ""}{todayGrowthPct}%
              </span>
              <span className="text-xs text-muted-foreground ml-2">vs 7-day avg</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mb-4 text-center">
            <Stat label="Brain entries" value={totals.brain} />
            <Stat label="Patterns learned" value={totals.learnings} />
            <Stat label="Pending review" value={totals.pending} />
            <Stat label="Approved" value={totals.approved} />
          </div>
          <div className="h-32 flex items-end gap-1">
            {growth.map((g) => {
              const total = g.learnings + g.drafts + g.brain;
              const h = Math.max(2, Math.round((total / maxBar) * 100));
              return (
                <div key={g.day} className="flex-1 flex flex-col items-center gap-1" title={`${g.day}: ${total} (learn ${g.learnings} · draft ${g.drafts} · brain ${g.brain})`}>
                  <div className="w-full bg-primary/70 rounded-t" style={{ height: `${h}%` }} />
                  <span className="text-[9px] text-muted-foreground font-mono">{g.day.slice(5)}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Bars combine new learning patterns + research drafts + brain entries per day. Cron runs nightly at 03:00 UTC. Approve drafts below to grow the brain — every approval bumps tomorrow's bar.
          </p>
        </Card>

        {/* Pending drafts */}
        <section>
          <h2 className="font-semibold mb-3">Pending drafts ({pending.length})</h2>
          {pending.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No drafts waiting. Hit “Run now” to research the top recurring user questions, or wait for tonight's run.
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map(d => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-sm">{d.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-3">{d.summary}</p>
                  {d.sources?.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {d.sources.slice(0, 5).map((s, i) => (
                        <a key={i} href={s} target="_blank" rel="noopener noreferrer" className="block text-[11px] text-primary hover:underline truncate">
                          [{i + 1}] {s} <ExternalLink className="inline h-3 w-3" />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approve(d)}><Check className="h-3 w-3 mr-1" />Approve → Brain</Button>
                    <Button size="sm" variant="outline" onClick={() => reject(d)}><X className="h-3 w-3 mr-1" />Reject</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        {reviewed.length > 0 && (
          <section>
            <h2 className="font-semibold mb-3 text-sm text-muted-foreground">Recently reviewed</h2>
            <div className="space-y-2">
              {reviewed.map(d => (
                <div key={d.id} className="text-xs flex items-center justify-between gap-2 px-3 py-2 rounded bg-card/40">
                  <span className="truncate">{d.title}</span>
                  <span className={`font-mono ${d.status === "approved" ? "text-fluoro-gold" : "text-muted-foreground"}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/40 p-3">
      <div className="text-xl font-mono">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}
