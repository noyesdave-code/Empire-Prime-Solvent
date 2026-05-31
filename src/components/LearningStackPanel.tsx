// Boardroom panel: deploy + monitor Ani's learning stack.
// Owner-only (admin). Calls ani-learning-deploy edge fn; reads live status
// from public.ani_learning_stack.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Brain, Rocket, Loader2, RefreshCw, CheckCircle2, PauseCircle } from "lucide-react";

type Stack = {
  enabled: boolean;
  scope: string;
  research_every_minutes: number;
  reflect_every_hours: number;
  last_research_at: string | null;
  last_reflect_at: string | null;
  deployed_at: string | null;
  converse_enabled: boolean;
  converse_daily_minutes_cap: number;
  notify_dave: boolean;
};

const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : "—";

export function LearningStackPanel() {
  const [stack, setStack] = useState<Stack | null>(null);
  const [scope, setScope] = useState("");
  const [loading, setLoading] = useState(true);
  const [deploying, setDeploying] = useState(false);
  const [budget, setBudget] = useState<{ used: number; cap: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const [{ data, error }, { data: bud }] = await Promise.all([
      supabase
        .from("ani_learning_stack")
        .select("enabled, scope, research_every_minutes, reflect_every_hours, last_research_at, last_reflect_at, deployed_at, converse_enabled, converse_daily_minutes_cap, notify_dave")
        .eq("id", 1)
        .maybeSingle(),
      supabase.from("ani_daily_budget").select("converse_minutes_used").eq("day", today).maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    if (data) {
      setStack(data as Stack);
      setScope(data.scope ?? "");
      setBudget({ used: Number(bud?.converse_minutes_used ?? 0), cap: (data as Stack).converse_daily_minutes_cap ?? 15 });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggleConverse = async () => {
    if (!stack) return;
    const next = !stack.converse_enabled;
    const { error } = await supabase.from("ani_learning_stack").update({ converse_enabled: next }).eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success(next ? "Peer-AI dialogues enabled" : "Peer-AI dialogues KILLED");
    load();
  };

  const deploy = async (enabled: boolean) => {
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("ani-learning-deploy", {
        body: { enabled, scope },
      });
      if (error) throw error;
      toast.success(enabled
        ? `Learning stack deployed. Research kicked: ${data?.research_kicked ? "yes" : "no"} · Reflect kicked: ${data?.reflect_kicked ? "yes" : "no"}`
        : "Learning stack paused.");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Deploy failed");
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 border-primary/40">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <div>
              <div className="font-bold">Ani Learning Stack</div>
              <div className="text-xs text-muted-foreground">
                Browsing + retrieval + 6-hour self-reflection. Research-only, drafts go to Boardroom → Research for your approval.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs">
            {stack?.enabled
              ? <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Active</>
              : <><PauseCircle className="h-4 w-4 text-muted-foreground" /> Idle</>}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs my-3">
          <div className="rounded border p-2">
            <div className="uppercase tracking-wider text-[10px] text-muted-foreground">Research cadence</div>
            <div className="font-semibold">every {stack?.research_every_minutes ?? 30} min</div>
            <div className="text-muted-foreground mt-0.5">last: {fmt(stack?.last_research_at ?? null)}</div>
          </div>
          <div className="rounded border p-2">
            <div className="uppercase tracking-wider text-[10px] text-muted-foreground">Reflection cycle</div>
            <div className="font-semibold">every {stack?.reflect_every_hours ?? 6} h</div>
            <div className="text-muted-foreground mt-0.5">last: {fmt(stack?.last_reflect_at ?? null)}</div>
          </div>
        </div>

        <div className="rounded border p-3 my-3 bg-muted/30">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold">Peer-AI dialogue kill-switch</div>
              <div className="text-[11px] text-muted-foreground">
                Free Lovable Gateway models only. Hard cap: {budget?.cap ?? 15} min/day intense exchange.
              </div>
              <div className="text-[11px] mt-1">
                Today: <strong>{budget ? budget.used.toFixed(1) : "0"} / {budget?.cap ?? 15} min</strong> used
                {budget && budget.used >= budget.cap && <span className="ml-2 text-emerald-600">✓ capped</span>}
              </div>
            </div>
            <Button
              size="sm"
              variant={stack?.converse_enabled ? "outline" : "default"}
              onClick={toggleConverse}
              className={stack?.converse_enabled ? "" : "bg-destructive text-destructive-foreground"}
            >
              {stack?.converse_enabled ? "KILL peer-AI" : "Resume peer-AI"}
            </Button>
          </div>
        </div>


        <div className="space-y-1.5">
          <Label htmlFor="scope" className="text-xs">Operating scope (sent to Ani every cycle)</Label>
          <Textarea
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            rows={4}
            placeholder="research-only, no publishing, library-of-congress breadth, propose ideas that help humanity"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button
            onClick={() => deploy(true)}
            disabled={deploying || loading}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold"
          >
            {deploying ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
            Deploy Learning Stack
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {stack?.enabled && (
            <Button variant="outline" size="sm" onClick={() => deploy(false)} disabled={deploying}>
              <PauseCircle className="h-4 w-4 mr-1" />
              Pause
            </Button>
          )}
          {stack?.deployed_at && (
            <span className="text-[10px] text-muted-foreground">deployed {fmt(stack.deployed_at)}</span>
          )}
        </div>

        <ul className="mt-3 text-xs text-muted-foreground space-y-1">
          <li>• Browsing/retrieval via Perplexity for live-web queries; cheap Lovable model synthesizes the rest.</li>
          <li>• Every 6h: 1-hour self-reflection — what Ani learned, blind spots, humanity-helping ideas.</li>
          <li>• All output drafts as <strong>pending</strong> in Boardroom → Research. You approve before anything publishes.</li>
        </ul>
      </Card>
    </div>
  );
}
