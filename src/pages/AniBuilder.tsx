import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, Rocket, ExternalLink, CheckCircle2, AlertTriangle, Brain, GitCommit, Activity, FileCode2 } from "lucide-react";

const OWNER_EMAIL = "noyes.dave@gmail.com";

const splitTargets = (value: string) =>
  value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);

export default function AniBuilder() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [prompt, setPrompt] = useState("");
  const [targetFiles, setTargetFiles] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  if (!isOwner) {
    return <div className="p-6 text-sm text-muted-foreground">Owner only.</div>;
  }

  const submit = async (extra: Record<string, unknown> = {}) => {
    if (!extra.deploy_only && !prompt.trim()) {
      toast({ title: "Tell Ani what to build", variant: "destructive" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ani-builder", {
        body: { prompt: prompt.trim(), target_files: splitTargets(targetFiles), ...extra },
      });
      if (error && !data) throw new Error(error.message);
      setResult(data);
      toast({
        title: data?.ok ? "Ani shipped it" : "Ani stopped",
        description: data?.commit?.head_sha?.slice(0, 7) ?? data?.error ?? data?.conclusion ?? "",
        variant: data?.ok ? undefined : "destructive",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setResult({ ok: false, error: message });
      toast({ title: "Ani Builder failed", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
      <header className="flex items-center gap-2">
        <Rocket className="text-destructive" size={20} />
        <h1 className="text-xl font-bold">Ani Builder — live deploy</h1>
        <span className="ml-auto text-[10px] uppercase text-muted-foreground">Owner only</span>
      </header>
      <p className="text-xs text-muted-foreground">
        plan → read → edit → atomic commit → deploy → verify. Targets <code>noyesdave-code/Empire-Prime-Solvent</code> <code>main</code>.
      </p>
      <label className="block text-xs">
        Instruction
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={6}
          placeholder='e.g. "Change the homepage chat arrow to use the black token and deploy."'
          className="mt-1 w-full rounded border border-border bg-background px-2 py-2 font-mono text-sm"
        />
      </label>
      <label className="block text-xs">
        Target files (optional)
        <textarea
          value={targetFiles}
          onChange={(e) => setTargetFiles(e.target.value)}
          rows={3}
          placeholder="src/pages/Index.tsx, src/components/AniChat.tsx"
          className="mt-1 w-full rounded border border-border bg-background px-2 py-2 font-mono text-xs"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileCode2 size={14} /> One atomic commit, one deploy run.
        </div>
        <button
          onClick={() => submit({ deploy_only: true, no_wait: true })}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-2 rounded border border-border bg-background px-3 py-2 text-xs font-bold disabled:opacity-50"
          title="Re-deploy current main without using AI credits"
        >
          {busy ? <Loader2 className="animate-spin" size={12} /> : <Rocket size={12} />}
          Re-deploy current main
        </button>
        <button
          onClick={() => submit()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Rocket size={14} />}
          {busy ? "Shipping..." : "Build and deploy"}
        </button>
      </div>
      {busy && (
        <div className="animate-pulse rounded border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Ani is scanning the repo, writing replacement files, pushing one commit, starting GitHub Pages, and verifying the run.
        </div>
      )}
      {result && (
        <section className="space-y-3">
          <div className={`flex items-start gap-2 rounded border p-3 text-xs ${result.ok ? "border-primary bg-primary/10 text-primary" : "border-destructive bg-destructive/10 text-destructive"}`}>
            {result.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <div className="min-w-0 flex-1">
              <div className="font-bold">
                {result.ok ? (result.dispatched ? "Deploy dispatched" : "Deployed live") : `Stopped: ${result.conclusion ?? result.error ?? "unknown"}`}
              </div>
              {result.commit?.head_sha && <div>Head: <code>{result.commit.head_sha.slice(0, 7)}</code></div>}
              <div className="mt-1 flex flex-wrap gap-3">
                {result.run_url && <a href={result.run_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={12} /> Workflow</a>}
                {result.actions_url && <a href={result.actions_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={12} /> Actions</a>}
                {result.live_url && <a href={result.live_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={12} /> Live site</a>}
                {result.repo_url && <a href={result.repo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline"><ExternalLink size={12} /> Repo</a>}
              </div>
            </div>
          </div>
          {result.plan && (
            <details className="rounded border border-border bg-muted/30 p-3 text-xs" open>
              <summary className="flex cursor-pointer items-center gap-2 font-bold"><Brain size={14} /> Plan</summary>
              <div className="mt-2 space-y-1">
                <div className="italic text-muted-foreground">{result.plan.rationale}</div>
                <div>Reads: <code>{result.plan.read?.join(", ") || "—"}</code></div>
                <div>Edits: <code>{result.plan.will_edit?.join(", ") || "—"}</code></div>
              </div>
            </details>
          )}
          {result.commit && (
            <details className="rounded border border-border bg-muted/30 p-3 text-xs" open>
              <summary className="flex cursor-pointer items-center gap-2 font-bold"><GitCommit size={14} /> Commit</summary>
              <div className="mt-2 space-y-1">
                <div>Base: <code>{result.commit.base_sha?.slice(0, 7)}</code></div>
                <div>Head: <code>{result.commit.head_sha?.slice(0, 7)}</code></div>
                <div>Files: <code>{result.commit.files?.join(", ") || "—"}</code></div>
              </div>
            </details>
          )}
          {Array.isArray(result.steps) && result.steps.length > 0 && (
            <details className="rounded border border-border bg-muted/30 p-3 text-xs" open>
              <summary className="flex cursor-pointer items-center gap-2 font-bold"><Activity size={14} /> Pipeline log</summary>
              <div className="mt-2 space-y-2">
                {result.steps.map((step: any, i: number) => (
                  <div key={i} className="rounded border border-border p-2">
                    <div className="font-bold">{step.status === "failed" ? "✗" : "✓"} {step.name}</div>
                    {step.detail && <div className="break-words text-muted-foreground">{step.detail}</div>}
                  </div>
                ))}
              </div>
            </details>
          )}
          {result.failed_log && (
            <details className="rounded border border-destructive bg-destructive/10 p-3 text-xs text-destructive" open>
              <summary className="cursor-pointer font-bold">Workflow failure log</summary>
              <pre className="mt-2 whitespace-pre-wrap font-mono">{result.failed_log}</pre>
            </details>
          )}
        </section>
      )}
    </main>
  );
}
