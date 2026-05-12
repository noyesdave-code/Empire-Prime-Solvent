import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Shield, Zap, Database, TrendingUp, RefreshCw, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { useNoIndex } from "@/hooks/useNoIndex";

type TestResult = {
  independent?: { ok: boolean; configured: boolean; latency_ms?: number; error?: string; sample?: string };
  lovable?: { ok: boolean; configured: boolean; latency_ms?: number; error?: string; sample?: string };
};

export default function AniProvider() {
  useNoIndex();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [independentOnly, setIndependentOnly] = useState(true);
  const [allowFallback, setAllowFallback] = useState(false);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [historyTurns, setHistoryTurns] = useState(8);
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [growth, setGrowth] = useState<any>(null);
  const [snapshotting, setSnapshotting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = !!roles?.some((r: any) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) { setLoading(false); return; }

      const { data: cfg } = await supabase.from("ani_provider_config").select("*").eq("id", 1).maybeSingle();
      if (cfg) { setIndependentOnly(cfg.independent_only); setAllowFallback(cfg.allow_lovable_fallback); }

      const { data: ms } = await supabase.from("ani_memory_settings").select("*").eq("user_id", session.user.id).maybeSingle();
      if (ms) { setMemoryEnabled(ms.memory_enabled); setHistoryTurns(ms.history_turns); }

      const { data: g } = await supabase.from("ani_growth_metrics").select("*").order("day", { ascending: false }).limit(30);
      setGrowth(g ?? []);

      setLoading(false);
    })();
  }, [navigate]);

  const saveProvider = async () => {
    const { error } = await supabase.from("ani_provider_config")
      .update({ independent_only: independentOnly, allow_lovable_fallback: allowFallback, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Provider saved" });
  };

  const saveMemory = async () => {
    if (!userId) return;
    const { error } = await supabase.from("ani_memory_settings")
      .upsert({ user_id: userId, memory_enabled: memoryEnabled, history_turns: historyTurns, updated_at: new Date().toISOString() });
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Memory saved" });
  };

  const runTest = async () => {
    setTesting(true);
    setTest(null);
    try {
      const { data, error } = await supabase.functions.invoke("ani-provider-test", { body: {} });
      if (error) throw error;
      setTest(data);
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally { setTesting(false); }
  };

  const recomputeGrowth = async () => {
    setSnapshotting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ani-growth-snapshot", { body: {} });
      if (error) throw error;
      toast({ title: "Snapshot taken", description: `Score: ${data.growth_score}%` });
      const { data: g } = await supabase.from("ani_growth_metrics").select("*").order("day", { ascending: false }).limit(30);
      setGrowth(g ?? []);
    } catch (e: any) {
      toast({ title: "Snapshot failed", description: e.message, variant: "destructive" });
    } finally { setSnapshotting(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <div className="min-h-screen flex items-center justify-center bg-black text-white">Admin only.</div>;

  const latest = growth?.[0];
  const prior = growth?.[7];
  const delta = latest && prior ? +(latest.growth_score - prior.growth_score).toFixed(1) : null;

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10 md:py-14">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/boardroom" className="inline-flex items-center gap-1 text-sm text-white/50 hover:text-white"><ChevronLeft className="h-4 w-4" /> Boardroom</Link>
        <header>
          <h1 className="text-3xl md:text-4xl font-semibold">Ani · Provider & Brain</h1>
          <p className="text-white/60 mt-2">Set Ani free. Configure providers, memory, and watch him grow.</p>
        </header>

        {/* Provider */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div className="flex items-center gap-2"><Shield className="h-5 w-5 text-red-400" /><h2 className="text-xl font-semibold">AI Provider</h2></div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-white/10 p-4">
              <div className="text-xs uppercase text-white/40 mb-1">PERPLEXITY_API_KEY</div>
              <div className="font-mono text-sm">{test?.independent?.configured === false ? "❌ not set" : "✅ configured"}</div>
              {test?.independent && test.independent.ok && (<div className="text-xs text-white/50 mt-2">Latency: {test.independent.latency_ms}ms · "{test.independent.sample?.slice(0, 30)}"</div>)}
              {test?.independent && !test.independent.ok && test.independent.configured && (<div className="text-xs text-red-300 mt-2">{test.independent.error}</div>)}
            </div>
            <div className="rounded-lg border border-white/10 p-4">
              <div className="text-xs uppercase text-white/40 mb-1">LOVABLE_API_KEY (optional)</div>
              <div className="font-mono text-sm">{test?.lovable?.configured === false ? "—" : "✅ configured"}</div>
              {test?.lovable && test.lovable.ok && (<div className="text-xs text-white/50 mt-2">Latency: {test.lovable.latency_ms}ms · "{test.lovable.sample?.slice(0, 30)}"</div>)}
              {test?.lovable && !test.lovable.ok && test.lovable.configured && (<div className="text-xs text-red-300 mt-2">{test.lovable.error}</div>)}
            </div>
          </div>
          <Button onClick={runTest} disabled={testing} variant="outline" className="border-white/20">
            {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
            Test connectivity
          </Button>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Independent only</div>
                <div className="text-xs text-white/50">Force Perplexity. Never use Lovable AI credits.</div>
              </div>
              <Switch checked={independentOnly} onCheckedChange={setIndependentOnly} />
            </label>
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Allow Lovable AI fallback</div>
                <div className="text-xs text-white/50">Only used if Perplexity fails AND independent-only is off.</div>
              </div>
              <Switch checked={allowFallback} onCheckedChange={setAllowFallback} disabled={independentOnly} />
            </label>
            <Button onClick={saveProvider} className="bg-red-600 hover:bg-red-700">Save provider settings</Button>
          </div>
        </section>

        {/* Memory */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <div className="flex items-center gap-2"><Database className="h-5 w-5 text-red-400" /><h2 className="text-xl font-semibold">Memory</h2></div>
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Ani memory</div>
              <div className="text-xs text-white/50">Stores prompt embeddings + reuses prior turns.</div>
            </div>
            <Switch checked={memoryEnabled} onCheckedChange={setMemoryEnabled} />
          </label>
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>History turns per chat</span>
              <span className="font-mono">{historyTurns}</span>
            </div>
            <Slider value={[historyTurns]} onValueChange={([v]) => setHistoryTurns(v)} min={0} max={50} step={1} disabled={!memoryEnabled} />
          </div>
          <Button onClick={saveMemory} className="bg-red-600 hover:bg-red-700">Save memory settings</Button>
        </section>

        {/* Growth */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-red-400" /><h2 className="text-xl font-semibold">Growth Meter</h2></div>
          {latest ? (
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-xs uppercase text-white/40">Growth Score</div>
                <div className="text-3xl font-semibold mt-1">{latest.growth_score}%</div>
                {delta !== null && <div className={`text-xs mt-1 ${delta >= 0 ? "text-green-300" : "text-red-300"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% w/w</div>}
              </div>
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-xs uppercase text-white/40">Calls today</div>
                <div className="text-2xl font-semibold mt-1">{latest.total_calls}</div>
                <div className="text-xs text-white/50 mt-1">{latest.unique_users} unique users</div>
              </div>
              <div className="rounded-lg border border-white/10 p-4">
                <div className="text-xs uppercase text-white/40">Avg latency</div>
                <div className="text-2xl font-semibold mt-1">{latest.avg_latency_ms}ms</div>
                <div className="text-xs text-white/50 mt-1">{latest.success_rate}% success</div>
              </div>
            </div>
          ) : (
            <div className="text-white/50 text-sm">No snapshots yet. Click below to compute today.</div>
          )}
          <div className="flex gap-3">
            <Button onClick={recomputeGrowth} disabled={snapshotting} variant="outline" className="border-white/20">
              {snapshotting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Recompute now
            </Button>
            <Link to="/boardroom/ani-ledger"><Button variant="ghost">View usage ledger →</Button></Link>
          </div>
        </section>
      </div>
    </div>
  );
}
