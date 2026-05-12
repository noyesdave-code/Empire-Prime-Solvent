import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBuildAttempts } from "@/hooks/useBuildAttempts";
import { BuildPaywall } from "@/components/BuildPaywall";
import { toast } from "@/hooks/use-toast";
import { Loader2, Code2, Rocket, Trash2, ShieldCheck, GitPullRequest, Sparkles, LogOut } from "lucide-react";

type Project = { id: string; name: string; slug: string; primary_language: string; updated_at: string; is_public: boolean };
type Template = { id: string; slug: string; name: string; description: string | null; language: string; icon: string | null };

export default function IDEHome() {
  const { user, loading, signOut } = useAuth();
  const nav = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [busy, setBusy] = useState(false);
  const [ghConn, setGhConn] = useState<{ id: string; github_login: string } | null>(null);
  const isOwner = user?.email?.toLowerCase() === "noyes.dave@gmail.com";
  const { status: buildStatus } = useBuildAttempts();
  const [showPaywall, setShowPaywall] = useState(false);
  const remaining = Math.max(0, buildStatus.limit - buildStatus.used);
  const unlimited = buildStatus.reason === "admin unlimited" || buildStatus.reason === "paid unlimited";

  useEffect(() => {
    if (loading) return;
    if (!user) { nav("/auth?next=/ide", { replace: true }); return; }
    document.title = "Empire IDE — sovereign cloud dev";
    (async () => {
      const [p, t] = await Promise.all([
        supabase.from("ide_projects").select("id,name,slug,primary_language,updated_at,is_public").order("updated_at", { ascending: false }),
        supabase.from("ide_templates").select("id,slug,name,description,language,icon").order("name"),
      ]);
      setProjects((p.data ?? []) as any);
      setTemplates((t.data ?? []) as any);
    })();
  }, [user, loading, nav]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("ide_github_connections")
        .select("id,github_login")
        .eq("user_id", user.id)
        .eq("status", "active")
        .order("last_used_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (data) setGhConn(data as any);
    })();
    const params = new URLSearchParams(window.location.search);
    if (params.get("gh") === "connected") {
      toast({ title: `GitHub connected as ${params.get("login") ?? "user"}` });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [user]);

  const connectGithub = async () => {
    if (!user) { nav("/auth?next=/ide"); return; }
    const returnTo = window.location.origin + window.location.pathname;
    const { data, error } = await supabase.functions.invoke("ide-github-oauth-initiate", { body: { return_to: returnTo } });
    if (error || !data?.url) {
      toast({ title: "Could not start GitHub OAuth", description: error?.message ?? data?.error ?? "unknown", variant: "destructive" });
      return;
    }
    window.location.href = data.url;
  };

  const fork = async (template_slug: string) => {
    if (!user) { nav("/auth?next=/ide"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ide-fork", { body: { template_slug } });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "fork failed");
      nav(`/ide/${data.project.id}`);
    } catch (e) {
      toast({ title: "Could not create project", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally { setBusy(false); }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this project and all its files?")) return;
    const { error } = await supabase.from("ide_projects").delete().eq("id", id);
    if (error) return toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    setProjects(p => p.filter(x => x.id !== id));
  };

  const handleSignOut = async () => {
    await signOut();
    nav("/auth?next=/ide", { replace: true });
  };

  if (loading || !user) return <div className="min-h-screen grid place-items-center bg-black text-white"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <header className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ color: "#dc2626" }}>Empire IDE</h1>
            <p className="text-zinc-400 text-sm mt-1">Sovereign cloud dev. Edit · run in microVMs · ship.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user && ghConn && <span className="text-xs text-emerald-400">GitHub @{ghConn.github_login}</span>}
            {user && (
              unlimited ? (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded border border-emerald-800 text-emerald-400">Unlimited builds</span>
              ) : (
                <button
                  onClick={() => { if (buildStatus.requiresPayment || remaining === 0) setShowPaywall(true); }}
                  className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${remaining === 0 ? "border-red-700 bg-red-950/40 text-red-300 hover:bg-red-900/50" : "border-zinc-800 text-zinc-400"}`}
                  title={remaining === 0 ? "Upgrade to keep building" : `${remaining} of ${buildStatus.limit} free build attempts left`}
                >
                  {remaining === 0 ? "Upgrade · 0 builds left" : `${remaining}/${buildStatus.limit} free builds`}
                </button>
              )
            )}
            {user && !ghConn && (
              <button onClick={connectGithub} className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 font-bold flex items-center gap-2">
                <ShieldCheck size={16}/> Connect GitHub
              </button>
            )}
            {isOwner && (
              <Link to="/boardroom/empire-pr" className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 font-bold flex items-center gap-2">
                <GitPullRequest size={16}/> Empire GitHub
              </Link>
            )}
            <button onClick={handleSignOut} className="px-3 py-2 rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900 flex items-center gap-2 text-sm">
              <LogOut size={14}/> Sign out
            </button>
            {!user && <Link to="/auth?next=/ide" className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 font-bold">Sign in to build</Link>}
          </div>
        </header>
        {user && !unlimited && (
          <div className="mb-6 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3 text-sm">
            <Sparkles size={14} className="text-red-500" />
            <span className="text-zinc-300">10 free builds, then $27/mo to keep shipping. Run, Build with Ani, and Deploy each use one attempt.</span>
            {remaining === 0 && (
              <button onClick={() => setShowPaywall(true)} className="ml-auto px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-xs font-bold">
                Upgrade
              </button>
            )}
          </div>
        )}

        <section className="mb-12">
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3">Start from a template</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {templates.map(t => (
              <button key={t.id} disabled={busy} onClick={() => fork(t.slug)}
                className="text-left p-4 rounded-xl border border-zinc-800 bg-zinc-950 hover:border-red-800 hover:bg-zinc-900 transition disabled:opacity-50">
                <div className="flex items-center gap-2 mb-1"><span className="text-xl">{t.icon ?? "📄"}</span><span className="font-bold">{t.name}</span></div>
                <p className="text-xs text-zinc-500">{t.description}</p>
                <div className="text-[10px] uppercase mt-2 text-zinc-600">{t.language}</div>
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2"><Code2 size={14}/> Your projects</h2>
          {!user ? (
            <p className="text-zinc-500 text-sm">Sign in to see your projects.</p>
          ) : projects.length === 0 ? (
            <p className="text-zinc-500 text-sm">No projects yet — pick a template above.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-zinc-800 bg-zinc-950 hover:border-red-800 transition">
                  <Link to={`/ide/${p.id}`} className="flex-1 min-w-0">
                    <div className="font-bold truncate">{p.name}</div>
                    <div className="text-[11px] text-zinc-500">{p.primary_language} · {new Date(p.updated_at).toLocaleString()}</div>
                  </Link>
                  <button onClick={() => del(p.id)} className="p-2 text-zinc-600 hover:text-red-500"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="mt-12 text-[10px] text-zinc-600">
          Code runs in isolated Firecracker microVMs (E2B). 30s timeout per run. Be hyper-aware: never paste secrets you don't own.
        </p>
      </div>
      <BuildPaywall open={showPaywall} used={buildStatus.used} limit={buildStatus.limit} onClose={() => setShowPaywall(false)} />
    </div>
  );
}
