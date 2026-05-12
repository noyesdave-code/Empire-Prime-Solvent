import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { Loader2, GitPullRequest, Plus, Trash2, Sparkles, ExternalLink, Rocket } from "lucide-react";

const OWNER_EMAIL = "noyes.dave@gmail.com";

type PatchFile = { path: string; content: string };

export default function EmpirePRPatch() {
  const { user } = useAuth();
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const [owner, setOwner] = useState("noyesdave-code");
  const [repo, setRepo] = useState("Empire-Prime-Solvent");
  const [base, setBase] = useState("main");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [contextPaths, setContextPaths] = useState("src/App.tsx\nsrc/pages/Index.tsx\nsrc/index.css\ntailwind.config.ts");
  const [files, setFiles] = useState<PatchFile[]>([{ path: "", content: "" }]);
  const [mode, setMode] = useState<"direct" | "pr">("direct");
  const [deployAfterPush, setDeployAfterPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [resultUrl, setResultUrl] = useState<string>("");

  if (!isOwner) {
    return <div className="p-6 text-sm text-zinc-500">Owner only.</div>;
  }

  const submit = async () => {
    const patchFiles = files.filter(f => f.path.trim() || f.content.trim());
    if (!owner || !repo || !title || (!prompt.trim() && patchFiles.some(f => !f.path.trim()))) {
      toast({ title: "Missing fields", description: "Owner, repo, title, and every manual file path are required.", variant: "destructive" });
      return;
    }
    if (!prompt.trim() && patchFiles.length === 0) {
      toast({ title: "Add Ani instructions or manual files", variant: "destructive" });
      return;
    }
    setBusy(true); setResult(""); setResultUrl("");
    try {
      const { data, error } = await supabase.functions.invoke("empire-pr-patch", {
        body: {
          owner, repo, base, title, description,
          mode,
          deploy: deployAfterPush,
          prompt: prompt.trim() || undefined,
          context_paths: contextPaths.split(/\n|,/).map(p => p.trim()).filter(Boolean),
          files: patchFiles,
        },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "GitHub update failed");
      const lines = [
        data.mode === "direct" ? `Pushed ${data.pushed} file(s) to ${owner}/${repo}:${base}` : `PR opened: ${data.pr_url}`,
        data.workflow_url ? `Deploy: ${data.workflow_url}` : "",
        data.live_url ? `Live: ${data.live_url}` : "",
        data.deploy_warning ? `Deploy warning: ${data.deploy_warning}` : "",
      ].filter(Boolean).join("\n");
      setResult(lines);
      setResultUrl(data.workflow_url ?? data.pr_url ?? data.repo_url ?? "");
      toast({ title: data.mode === "direct" ? "Ani pushed to GitHub" : "PR drafted", description: data.workflow_url ?? data.pr_url ?? data.repo_url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setResult(`Error: ${msg}`);
      toast({ title: "GitHub update failed", description: msg, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-4">
      <header className="flex items-center gap-2">
        <Rocket className="text-red-600" size={20}/>
        <h1 className="text-xl font-bold">Ani → Empire GitHub</h1>
        <span className="ml-auto text-[10px] uppercase text-zinc-500">Admin · owner-authorized</span>
      </header>
      <p className="text-xs text-zinc-500">
        Ani can push owner-approved code directly to GitHub or draft a PR. Protected paths (.env, private keys, generated backend client/types) stay blocked.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded border border-zinc-900 bg-zinc-950 p-3">
        <label className="text-xs">Update mode
          <select value={mode} onChange={e => setMode(e.target.value as "direct" | "pr")} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm">
            <option value="direct">Direct push to branch</option>
            <option value="pr">Open pull request</option>
          </select>
        </label>
        <label className="text-xs flex items-end gap-2 pb-1">
          <input type="checkbox" checked={deployAfterPush} disabled={mode !== "direct"} onChange={e => setDeployAfterPush(e.target.checked)} className="accent-red-600" />
          Deploy after direct push
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs">GitHub owner
          <input value={owner} onChange={e => setOwner(e.target.value)} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm"/>
        </label>
        <label className="text-xs">Repo name
          <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="e.g. empire-prime-solvent" className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm"/>
        </label>
        <label className="text-xs">Base branch
          <input value={base} onChange={e => setBase(e.target.value)} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm"/>
        </label>
        <label className="text-xs">PR title
          <input value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm"/>
        </label>
      </div>

      <label className="text-xs block">PR description
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
          className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm font-mono"/>
      </label>

      <div className="border border-red-950/60 bg-red-950/20 rounded p-3 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={14} className="text-red-500"/> Ani drafts the patch</div>
        <label className="text-xs block">Ani instructions
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
            placeholder="Tell Ani exactly what to change in the Empire repo. Leave blank if you are pasting manual files below."
            className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-sm font-mono"/>
        </label>
        <label className="text-xs block">GitHub context files Ani should read first
          <textarea value={contextPaths} onChange={e => setContextPaths(e.target.value)} rows={3}
            className="mt-1 w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs font-mono"/>
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase text-zinc-500">Files in patch</span>
          <button onClick={() => setFiles(f => [...f, { path: "", content: "" }])}
            className="text-xs flex items-center gap-1 px-2 py-1 bg-zinc-900 hover:bg-zinc-800 rounded">
            <Plus size={12}/>Add file
          </button>
        </div>
        {files.map((f, i) => (
          <div key={i} className="border border-zinc-900 rounded p-2 space-y-1">
            <div className="flex gap-2">
              <input value={f.path} onChange={e => setFiles(fs => fs.map((x, j) => j === i ? { ...x, path: e.target.value } : x))}
                placeholder="src/components/Foo.tsx"
                className="flex-1 bg-black border border-zinc-800 rounded px-2 py-1 text-xs font-mono"/>
              <button onClick={() => setFiles(fs => fs.filter((_, j) => j !== i))}
                className="px-2 text-zinc-500 hover:text-red-500"><Trash2 size={12}/></button>
            </div>
            <textarea value={f.content} onChange={e => setFiles(fs => fs.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
              rows={6} placeholder="// full file contents (replaces existing)"
              className="w-full bg-black border border-zinc-800 rounded px-2 py-1 text-xs font-mono resize-y"/>
          </div>
        ))}
      </div>

      <button onClick={submit} disabled={busy}
        className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-sm font-bold flex items-center gap-2 disabled:opacity-50">
        {busy ? <Loader2 className="animate-spin" size={14}/> : mode === "direct" ? <Rocket size={14}/> : <GitPullRequest size={14}/>} {mode === "direct" ? "Push + Deploy" : "Draft PR"}
      </button>

      {result && (
        <div className="text-xs whitespace-pre-wrap p-3 bg-zinc-950 border border-zinc-900 rounded space-y-2">
          <pre>{result}</pre>
          {resultUrl && <a href={resultUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-red-400 hover:text-red-300"><ExternalLink size={12}/> Open GitHub PR</a>}
        </div>
      )}
    </div>
  );
}
