import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Loader2, Play, ArrowLeft, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type Outcome = "pass" | "fail" | "skip";
interface Check {
  id: string;
  category: "rls" | "auth" | "enum" | "rate_limit" | "input";
  title: string;
  outcome: Outcome;
  detail: string;
}
interface Run {
  id: string;
  name: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  results: Check[];
  stats: { passed?: number; failed?: number; skipped?: number; total?: number };
  notes: string | null;
}

const CATEGORY_LABEL: Record<Check["category"], string> = {
  rls: "RLS",
  auth: "Auth Boundary",
  enum: "Enumeration",
  rate_limit: "Rate Limit",
  input: "Input Validation",
};

export default function BoardroomSecurity() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [running, setRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<Run | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth?redirect=/boardroom/security"); return; }
    (async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = !!data?.some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) await loadRuns();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  const loadRuns = async () => {
    const { data, error } = await supabase
      .from("security_audit_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) { toast.error(error.message); return; }
    const list = (data ?? []) as unknown as Run[];
    setRuns(list);
    if (list[0]) setActiveRun(list[0]);
  };

  const runPentest = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("security-pentest");
      if (error) throw error;
      toast.success(`Sweep complete — ${data.passed} pass / ${data.failed} fail`);
      await loadRuns();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Pentest failed");
    } finally {
      setRunning(false);
    }
  };

  if (loading || isAdmin === null) {
    return <main className="min-h-screen bg-background grid place-items-center text-foreground">Loading…</main>;
  }
  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-4 text-foreground">
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 text-destructive" />
          <h1 className="text-xl font-bold mb-2">Admin only</h1>
          <Button asChild variant="outline"><Link to="/boardroom"><ArrowLeft className="h-4 w-4 mr-1" />Boardroom</Link></Button>
        </Card>
      </main>
    );
  }

  const passed = activeRun?.stats?.passed ?? 0;
  const failed = activeRun?.stats?.failed ?? 0;
  const skipped = activeRun?.stats?.skipped ?? 0;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <title>Security Sweep · Boardroom</title>
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-30 bg-background/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Advanced Security Sweep</h1>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/boardroom"><ArrowLeft className="h-4 w-4 mr-1" />Boardroom</Link></Button>
          <Button size="sm" onClick={runPentest} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
            {running ? "Running…" : "Run sweep"}
          </Button>
        </div>
      </header>

      <section className="px-6 py-6 grid gap-4 lg:grid-cols-[1fr_2fr]">
        <Card className="p-4">
          <h2 className="font-bold mb-3">Recent runs</h2>
          {runs.length === 0 && <p className="text-sm text-muted-foreground">No sweeps yet — click "Run sweep".</p>}
          <ul className="space-y-2 max-h-[60vh] overflow-y-auto">
            {runs.map((r) => {
              const f = r.stats?.failed ?? 0;
              const p = r.stats?.passed ?? 0;
              const ok = f === 0 && r.status === "ok";
              return (
                <li key={r.id}>
                  <button
                    onClick={() => setActiveRun(r)}
                    className={`w-full text-left rounded-lg border p-3 hover:bg-muted/50 ${activeRun?.id === r.id ? "border-primary" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {new Date(r.started_at).toLocaleString()}
                      </span>
                      <Badge variant={ok ? "default" : "destructive"} className="text-[10px]">
                        {ok ? `${p} pass` : `${f} fail`}
                      </Badge>
                    </div>
                    <div className="text-xs mt-1 text-muted-foreground">{r.status}</div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="p-4">
          {!activeRun ? (
            <p className="text-sm text-muted-foreground">Select a run to view details.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="font-bold">{activeRun.name}</h2>
                  <p className="text-xs text-muted-foreground font-mono">{activeRun.id}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant="default" className="bg-emerald-600">{passed} pass</Badge>
                  <Badge variant="destructive">{failed} fail</Badge>
                  <Badge variant="secondary">{skipped} skip</Badge>
                </div>
              </div>
              {activeRun.notes && (
                <p className="text-xs text-destructive mb-3 font-mono">{activeRun.notes}</p>
              )}
              <ul className="space-y-2">
                {(activeRun.results ?? []).map((c) => (
                  <li key={c.id} className="flex items-start gap-3 rounded border border-border p-3">
                    {c.outcome === "pass" && <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />}
                    {c.outcome === "fail" && <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
                    {c.outcome === "skip" && <MinusCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{c.title}</span>
                        <Badge variant="outline" className="text-[9px]">{CATEGORY_LABEL[c.category]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 break-all">{c.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </section>
    </main>
  );
}
