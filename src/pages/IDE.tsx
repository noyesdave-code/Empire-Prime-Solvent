import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuildAttempts } from "@/hooks/useBuildAttempts";
import { BuildPaywall } from "@/components/BuildPaywall";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, Save, Plus, Trash2, FileCode, Sparkles, Send, Globe, Rocket, ShieldCheck } from "lucide-react";

type Project = { id: string; name: string; primary_language: string; owner_id: string; is_public: boolean };
type IFile = { id: string; path: string; content: string; language: string | null };
type ChatMsg = { role: "user" | "assistant"; content: string; file_count?: number; applied?: boolean; changes?: { path: string; action: "created" | "updated" }[] };

const OWNER_EMAIL = "noyes.dave@gmail.com";

const langFromPath = (p: string): string => {
  const ext = p.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", json: "json", html: "html", css: "css", md: "markdown", sh: "shell", yml: "yaml", yaml: "yaml" };
  return map[ext ?? ""] ?? "plaintext";
};
const runLangFromMonaco = (m: string) =>
  (["python", "javascript", "typescript", "bash"] as readonly string[]).includes(m) ? m : "javascript";
const safeGeneratedPath = (path: string) =>
  Boolean(path) && path.length <= 180 && !path.startsWith("/") && !path.includes("..") && !path.includes("\\") &&
  !/\.env($|\.)/i.test(path) && !/(^|\/)(id_rsa|id_dsa|id_ed25519|\.ssh|\.npmrc|\.netrc|\.pypirc|credentials|secrets?)$/i.test(path) &&
  /^[A-Za-z0-9._@/+-]+$/.test(path);
const containsHardcodedSecret = (content: string) =>
  /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bghp_[A-Za-z0-9_]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bsk-[A-Za-z0-9_-]{32,}\b|\bAKIA[0-9A-Z]{16}\b|\b(?:GITHUB_TOKEN|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|E2B_API_KEY)\s*=\s*["']?[A-Za-z0-9_./+=-]{20,}/.test(content);

export default function IDE() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const nav = useNavigate();
  const [proj, setProj] = useState<Project | null>(null);
  const [files, setFiles] = useState<IFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [aniInput, setAniInput] = useState("");
  const [aniBusy, setAniBusy] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [ghConn, setGhConn] = useState<{ id: string; github_login: string } | null>(null);
  const [showDeploy, setShowDeploy] = useState(false);
  const [vercelToken, setVercelToken] = useState("");
  const dirty = useRef(false);
  const pendingDeployRef = useRef(false);
  const ghPopupRef = useRef<Window | null>(null);
  const isOwner = user?.email?.toLowerCase() === OWNER_EMAIL;
  const { status: buildStatus, consume: consumeAttempt, refresh: refreshAttempts } = useBuildAttempts();
  const [showPaywall, setShowPaywall] = useState(false);

  // Charge one build attempt; show paywall if exhausted. Returns true to proceed.
  const tryConsume = async (): Promise<boolean> => {
    const result = await consumeAttempt();
    if (!result.allowed) {
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: p } = await supabase.from("ide_projects").select("*").eq("id", id).single();
      if (!p) { toast({ title: "Project not found", variant: "destructive" }); nav("/ide"); return; }
      setProj(p as Project);
      document.title = `${p.name} — Empire IDE`;
      const { data: fs } = await supabase.from("ide_files").select("*").eq("project_id", id).order("path");
      setFiles((fs ?? []) as IFile[]);
      if (fs?.length) setActiveId(fs[0].id);
    })();
  }, [id, nav]);

  const active = useMemo(() => files.find(f => f.id === activeId) ?? null, [files, activeId]);
  const monacoLang = active ? (active.language ?? langFromPath(active.path)) : "plaintext";

  const reloadFiles = async () => {
    if (!id) return;
    const { data: fs } = await supabase.from("ide_files").select("*").eq("project_id", id).order("path");
    const next = (fs ?? []) as IFile[];
    setFiles(next);
    if (!next.some(f => f.id === activeId)) setActiveId(next[0]?.id ?? null);
  };

  const updateContent = (val: string | undefined) => {
    if (!active) return;
    dirty.current = true;
    setFiles(fs => fs.map(f => f.id === active.id ? { ...f, content: val ?? "" } : f));
  };

  const saveAll = async () => {
    if (!proj) return;
    setSaving(true);
    try {
      for (const f of files) {
        await supabase.from("ide_files").update({ content: f.content, size_bytes: f.content.length }).eq("id", f.id);
      }
      dirty.current = false;
      toast({ title: "Saved" });
    } catch (e) {
      toast({ title: "Save failed", description: String(e), variant: "destructive" });
    } finally { setSaving(false); }
  };

  // autosave every 8s if dirty
  useEffect(() => {
    const t = setInterval(() => { if (dirty.current && !saving) saveAll(); }, 8000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, saving]);

  const newFile = async () => {
    if (!proj) return;
    const path = prompt("New file path (e.g. utils.js):");
    if (!path) return;
    const lang = langFromPath(path);
    const { data, error } = await supabase.from("ide_files").insert({
      project_id: proj.id, path, content: "", language: lang, size_bytes: 0,
    }).select().single();
    if (error || !data) return toast({ title: "Create failed", description: error?.message, variant: "destructive" });
    setFiles(fs => [...fs, data as IFile]);
    setActiveId(data.id);
  };

  const delFile = async (fid: string) => {
    if (!confirm("Delete file?")) return;
    await supabase.from("ide_files").delete().eq("id", fid);
    setFiles(fs => fs.filter(f => f.id !== fid));
    if (activeId === fid) setActiveId(files[0]?.id ?? null);
  };

  const run = async () => {
    if (!active || !proj) return;
    if (!(await tryConsume())) return;
    if (dirty.current) await saveAll();
    setRunning(true); setOutput("Running in microVM…");
    try {
      const { data, error } = await supabase.functions.invoke("ide-run", {
        body: { language: runLangFromMonaco(monacoLang), source: active.content, project_id: proj.id },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "run failed");
      const out = [data.stdout, data.stderr ? `\n--- stderr ---\n${data.stderr}` : ""].join("");
      setOutput(`${out || "(no output)"}\n\n[exit ${data.exitCode} · ${data.duration_ms}ms]`);
    } catch (e) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally { setRunning(false); refreshAttempts(); }
  };

  const togglePublic = async () => {
    if (!proj) return;
    const next = !proj.is_public;
    const { error } = await supabase.from("ide_projects").update({ is_public: next }).eq("id", proj.id);
    if (error) return toast({ title: "Update failed", description: error.message, variant: "destructive" });
    setProj({ ...proj, is_public: next });
    toast({ title: next ? "Public — sharable URL active" : "Private" });
  };

  const askAni = async (apply = false) => {
    if (!aniInput.trim() || aniBusy || !proj) return;
    if (apply && !(await tryConsume())) return;
    if (dirty.current) await saveAll();
    const q = aniInput.trim();
    setAniInput(""); setChat(c => [...c, { role: "user", content: q }]);
    setAniBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ide-agent", {
        body: { prompt: q, project_id: proj.id, apply },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "agent failed");
      setChat(c => [...c, { role: "assistant", content: data.reply, file_count: data.file_count ?? 0, applied: data.applied, changes: data.changes ?? [] }]);
      if (data.applied) {
        await reloadFiles();
        toast({ title: data.changes?.length ? `Ani applied ${data.changes.length} file(s)` : "Ani found no safe file changes" });
      }
    } catch (e) {
      setChat(c => [...c, { role: "assistant", content: `Error: ${e instanceof Error ? e.message : String(e)}` }]);
    } finally { setAniBusy(false); refreshAttempts(); }
  };

  // Apply code blocks from Ani: ```lang file=path
  const applyFromAni = async (msg: string) => {
    if (!proj) return;
    const re = /```(\w+)\s+file=([^\s\n]+)\s*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(msg))) {
      const [, lang, path, content] = m;
      if (!safeGeneratedPath(path) || containsHardcodedSecret(content)) continue;
      const existing = files.find(f => f.path === path);
      if (existing) {
        await supabase.from("ide_files").update({ content, size_bytes: content.length }).eq("id", existing.id);
        setFiles(fs => fs.map(f => f.id === existing.id ? { ...f, content } : f));
      } else {
        const { data } = await supabase.from("ide_files").insert({ project_id: proj.id, path, content, language: lang, size_bytes: content.length }).select().single();
        if (data) setFiles(fs => [...fs, data as IFile]);
      }
      count++;
    }
    if (count) await reloadFiles();
    toast({ title: count ? `Applied ${count} file(s)` : "No file blocks found" });
  };

  // Load existing GitHub connection (per-user) + listen for popup OAuth completion
  useEffect(() => {
    if (!user) return;
    const loadConn = async () => {
      const { data } = await supabase
        .from("ide_github_connections")
        .select("id,github_login")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (data) setGhConn(data as any);
      return data as { id: string; github_login: string } | null;
    };
    loadConn();
    // Catch oauth callback redirect param (full-redirect fallback)
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected") {
      toast({ title: `GitHub connected as ${params.get("login") ?? "user"}` });
      window.history.replaceState({}, "", window.location.pathname);
    }
    // Popup-mode: receive postMessage from /functions/v1/ide-github-oauth-callback
    const onMsg = async (ev: MessageEvent) => {
      const d = ev.data as { type?: string; login?: string } | null;
      if (!d || d.type !== "empire-gh-connected") return;
      try { ghPopupRef.current?.close(); } catch {}
      const conn = await loadConn();
      toast({ title: `GitHub connected${d.login ? ` as ${d.login}` : ""}` });
      if (pendingDeployRef.current && conn) {
        pendingDeployRef.current = false;
        // small delay to let state settle
        setTimeout(() => deployToGithub(conn), 300);
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const connectGithub = async (opts?: { popup?: boolean }) => {
    const returnTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.functions.invoke("ide-github-oauth-initiate", { body: { return_to: returnTo } });
    if (error || !data?.url) {
      toast({ title: "Could not start GitHub OAuth", description: error?.message ?? data?.error ?? "unknown", variant: "destructive" });
      return;
    }
    if (opts?.popup !== false) {
      const w = window.open(data.url, "empire-gh-oauth", "popup=1,width=640,height=760,noopener=no");
      if (w) { ghPopupRef.current = w; return; }
      // popup blocked → fall back to full redirect
    }
    window.location.href = data.url;
  };

  const empireRepoName = (() => {
    const slug = (proj?.name ?? "site").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "site";
    return slug.startsWith("empire-") ? slug : `empire-${slug}`;
  })();

  const deployToGithub = async (overrideConn?: { id: string; github_login: string } | null) => {
    if (!proj || deploying) return;
    const conn = overrideConn ?? ghConn;
    if (!conn && !isOwner) { toast({ title: "Connect GitHub first" }); return; }
    if (!(await tryConsume())) return;
    if (dirty.current) await saveAll();
    setDeploying(true);
    toast({ title: "Shipping…", description: `${empireRepoName} → ${conn?.github_login ?? "owner account"}` });
    try {
      const { data, error } = await supabase.functions.invoke("ide-github-deploy", {
        body: { project_id: proj.id, repo_name: empireRepoName, connection_id: conn?.id ?? null },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "deploy failed");
      const msg = `Deployed ${data.pushed} file(s) to the Empire chain.\n\nGitHub:  ${data.repo_url}\nActions: ${data.workflow_url}\nLive:    ${data.pages_url}\n\n— Want a custom domain? —\nBuy one at https://dash.cloudflare.com/?to=/:account/domains/register or https://vercel.com/domains, then point it at the Live URL above. Custom-domain auto-attach lands in v2.`;
      setOutput(msg);
      toast({ title: "Shipped 🚀", description: data.pages_url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOutput(`Deploy error: ${msg}`);
      toast({ title: "Ship failed", description: msg, variant: "destructive" });
    } finally { setDeploying(false); setShowDeploy(false); refreshAttempts(); }
  };

  const deployToVercel = async () => {
    if (!proj || deploying) return;
    if (!isOwner && !vercelToken.trim()) { toast({ title: "Paste your Vercel token first" }); return; }
    if (!(await tryConsume())) return;
    if (dirty.current) await saveAll();
    setDeploying(true);
    try {
      const { data, error } = await supabase.functions.invoke("ide-vercel-deploy", {
        body: { project_id: proj.id, project_name: proj.name, vercel_token: vercelToken.trim() || undefined },
      });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "deploy failed");
      const msg = `Vercel: ${data.live_url ?? "(no url)"}\nInspector: ${data.inspector_url ?? "—"}`;
      setOutput(msg);
      toast({ title: "Deployed to Vercel", description: data.live_url });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setOutput(`Deploy error: ${msg}`);
      toast({ title: "Deploy failed", description: msg, variant: "destructive" });
    } finally { setDeploying(false); setShowDeploy(false); refreshAttempts(); }
  };

  if (authLoading) return <div className="min-h-screen grid place-items-center bg-black text-white"><Loader2 className="animate-spin"/></div>;
  if (!user) { nav(`/auth?next=/ide/${id}`); return null; }
  if (!proj) return <div className="min-h-screen grid place-items-center bg-black text-white"><Loader2 className="animate-spin"/></div>;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="px-4 py-2 border-b border-zinc-900 flex items-center gap-3 flex-wrap">
        <button onClick={() => nav("/ide")} className="text-xs text-zinc-500 hover:text-white">← Projects</button>
        <span className="font-bold truncate" style={{ color: "#dc2626" }}>{proj.name}</span>
        <span className="text-[10px] uppercase text-zinc-600">{proj.primary_language}</span>
        {(() => {
          if (buildStatus.reason === "admin unlimited" || buildStatus.reason === "paid unlimited") {
            return <span className="text-[10px] text-emerald-400 hidden md:inline">Unlimited</span>;
          }
          const remaining = Math.max(0, buildStatus.limit - buildStatus.used);
          return (
            <button
              onClick={() => { if (buildStatus.requiresPayment) setShowPaywall(true); }}
              className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${remaining === 0 ? "border-red-700 bg-red-950/40 text-red-300 hover:bg-red-900/50" : "border-zinc-800 text-zinc-400"}`}
              title={remaining === 0 ? "Free attempts used — tap to upgrade" : `${remaining} free build attempts left`}
            >
              {remaining === 0 ? "Upgrade · 0 left" : `${remaining}/${buildStatus.limit} free`}
            </button>
          );
        })()}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={togglePublic} title="Toggle public deploy preview"
            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${proj.is_public ? "bg-red-700 hover:bg-red-600" : "bg-zinc-800 hover:bg-zinc-700"}`}>
            <Globe size={12}/>{proj.is_public ? "Public" : "Private"}
          </button>
          <button onClick={saveAll} disabled={saving} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1">
            {saving ? <Loader2 size={12} className="animate-spin"/> : <Save size={12}/>} Save
          </button>
          <button onClick={run} disabled={running || !active} className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-xs font-bold flex items-center gap-1 disabled:opacity-50">
            {running ? <Loader2 size={12} className="animate-spin"/> : <Play size={12}/>} Run
          </button>
          {!ghConn && (
            <button onClick={() => { pendingDeployRef.current = false; connectGithub(); }} className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1">
              <ShieldCheck size={12}/> Connect GitHub
            </button>
          )}
          {ghConn && (
            <span className="text-[10px] text-emerald-400 hidden md:inline" title="Your GitHub is connected">@{ghConn.github_login}</span>
          )}
          <div className="relative">
            <button onClick={() => setShowDeploy(v => !v)} disabled={files.length === 0} className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1 disabled:opacity-50">
              {deploying ? <Loader2 size={12} className="animate-spin"/> : <Rocket size={12}/>} Deploy
            </button>
            {showDeploy && (
              <div className="absolute right-0 mt-1 w-72 bg-zinc-950 border border-zinc-800 rounded shadow-xl z-50 p-3 space-y-3 text-left">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 mb-1">GitHub Pages</div>
                  {(ghConn || isOwner) ? (
                    <button onClick={() => deployToGithub()} disabled={deploying} className="w-full px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2 disabled:opacity-50">
                      <Rocket size={12}/> Push to {ghConn ? `@${ghConn.github_login}/${empireRepoName}` : `owner / ${empireRepoName}`}
                    </button>
                  ) : (
                    <button onClick={() => { pendingDeployRef.current = false; connectGithub(); }} className="w-full px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2">
                      <ShieldCheck size={12}/> Connect your GitHub first
                    </button>
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500 mb-1">Vercel</div>
                  {!isOwner && (
                    <input value={vercelToken} onChange={e => setVercelToken(e.target.value)} type="password"
                      placeholder="Vercel personal token (vercel.com/account/tokens)"
                      className="w-full mb-1 px-2 py-1 text-[11px] bg-black border border-zinc-800 rounded outline-none focus:border-amber-500"/>
                  )}
                  <button onClick={deployToVercel} disabled={deploying} className="w-full px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-2 disabled:opacity-50">
                    <Rocket size={12}/> Deploy to Vercel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 min-h-0">
        {/* File tree */}
        <aside className="col-span-2 border-r border-zinc-900 bg-zinc-950 overflow-y-auto">
          <div className="p-2 flex items-center justify-between">
            <span className="text-[10px] uppercase text-zinc-600">Files</span>
            <button onClick={newFile} className="p-1 hover:bg-zinc-800 rounded"><Plus size={12}/></button>
          </div>
          {files.map(f => (
            <div key={f.id} className={`group flex items-center px-2 py-1 cursor-pointer text-xs ${activeId === f.id ? "bg-zinc-900 text-white" : "text-zinc-400 hover:bg-zinc-900"}`}
              onClick={() => setActiveId(f.id)}>
              <FileCode size={12} className="mr-1 shrink-0"/>
              <span className="truncate flex-1">{f.path}</span>
              <button onClick={(e) => { e.stopPropagation(); delFile(f.id); }} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500"><Trash2 size={10}/></button>
            </div>
          ))}
        </aside>

        {/* Editor + output */}
        <main className="col-span-7 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            {active ? (
              <Editor
                height="100%"
                theme="vs-dark"
                language={monacoLang}
                value={active.content}
                onChange={updateContent}
                options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
              />
            ) : <div className="grid place-items-center h-full text-zinc-600 text-sm">Select or create a file</div>}
          </div>
          <div className="h-48 border-t border-zinc-900 bg-black overflow-auto">
            <div className="px-3 py-1 text-[10px] uppercase text-zinc-600 border-b border-zinc-900">Output</div>
            <pre className="p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap">{output || "Ready. Press Run."}</pre>
          </div>
        </main>

        {/* Ani */}
        <aside className="col-span-3 border-l border-zinc-900 bg-zinc-950 flex flex-col min-h-0">
          <div className="px-3 py-2 border-b border-zinc-900 flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#dc2626" }}/>
            <span className="font-bold text-sm">Ani · co-coder</span>
            <ShieldCheck size={13} className="ml-auto text-primary" />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
            {chat.length === 0 && <p className="text-zinc-600 italic">Ask Ani to build real files in this project. Every signed-in customer gets their own guarded workspace; secrets and Empire platform code stay blocked.</p>}
            {chat.map((m, i) => (
              <div key={i} className={`p-2 rounded ${m.role === "user" ? "bg-red-950/40 border border-red-900/40" : "bg-zinc-900 border border-zinc-800"}`}>
                <div className="text-[10px] uppercase text-zinc-500 mb-1 flex justify-between">
                  <span>{m.role === "user" ? "You" : "Ani"}</span>
                  {m.role === "assistant" && !m.applied && <button onClick={() => applyFromAni(m.content)} className="text-amber-400 hover:text-amber-300 normal-case">Apply files</button>}
                </div>
                {m.applied && <div className="mb-2 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">Applied {m.changes?.length ?? 0} safe file change(s).</div>}
                <pre className="whitespace-pre-wrap font-mono text-zinc-200 leading-relaxed">{m.content}</pre>
              </div>
            ))}
            {aniBusy && <div className="text-zinc-500 flex items-center gap-1"><Loader2 size={12} className="animate-spin"/>thinking…</div>}
          </div>
          <div className="p-2 border-t border-zinc-900 flex gap-1">
            <textarea value={aniInput} onChange={e => setAniInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) askAni(false); }}
              rows={2} placeholder="Ask Ani… (Cmd/Ctrl+Enter)"
              className="flex-1 bg-black border border-zinc-800 rounded p-2 text-xs resize-none focus:outline-none focus:border-red-800"/>
            <button onClick={() => askAni(false)} disabled={aniBusy || !aniInput.trim()} title="Ask Ani" className="px-2 bg-zinc-800 hover:bg-zinc-700 rounded disabled:opacity-50">
              {aniBusy ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
            </button>
            <button onClick={() => askAni(true)} disabled={aniBusy || !aniInput.trim()} title="Build and apply safe files" className="px-2 bg-red-700 hover:bg-red-600 rounded disabled:opacity-50 font-bold text-xs">
              Build
            </button>
          </div>
        </aside>
      </div>
      <BuildPaywall open={showPaywall} used={buildStatus.used} limit={buildStatus.limit} onClose={() => setShowPaywall(false)} />

      {/* One-tap floating ship button — visible everywhere in the IDE */}
      <button
        onClick={() => {
          if (!ghConn && !isOwner) {
            pendingDeployRef.current = true;
            toast({ title: "Connecting GitHub…", description: "We'll ship the moment it's linked." });
            connectGithub();
            return;
          }
          deployToGithub();
        }}
        disabled={deploying || files.length === 0}
        title={ghConn || isOwner ? "Ship to GitHub Pages right now" : "Connect GitHub, then ship"}
        className="fixed bottom-5 right-5 z-50 px-5 py-3 rounded-full font-black text-sm shadow-2xl flex items-center gap-2 disabled:opacity-50 transition-transform hover:scale-105"
        style={{
          background: "linear-gradient(135deg, hsl(0 90% 45%), hsl(0 100% 35%))",
          color: "white",
          border: "1px solid hsl(0 100% 70% / 0.6)",
          boxShadow: "0 0 32px hsl(0 100% 45% / 0.55)",
        }}
      >
        {deploying ? <Loader2 size={16} className="animate-spin"/> : <Rocket size={16}/>}
        {deploying ? "Shipping…" : "Ship It"}
      </button>
    </div>
  );
}
