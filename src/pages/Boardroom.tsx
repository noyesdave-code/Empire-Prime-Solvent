import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/sonner";
import { Crown, FileText, Video, Sparkles, BarChart3, LogOut, ExternalLink, Trash2, MessageCircle, Send, Eraser, Building2, FileDown, ChevronRight, ListChecks, Shield, Layout, Factory, Phone, Rocket, Loader2, CheckCircle2, GitPullRequest, Brain, Radio, Image as ImageIcon } from "lucide-react";
import { RenewalAgentButton } from "@/components/RenewalAgentButton";
import { FounderChecklist } from "@/components/FounderChecklist";
import { DefenseDepartment } from "@/components/DefenseDepartment";
import { UnicornSandbox } from "@/components/UnicornSandbox";
import { DefenseGate } from "@/components/DefenseGate";
import { FleetDirectory } from "@/components/FleetDirectory";
import { LearningStackPanel } from "@/components/LearningStackPanel";
import { AniLiveMonitor } from "@/components/AniLiveMonitor";
import { AniMediaStudio } from "@/components/AniMediaStudio";
import { AniDaveInbox } from "@/components/AniDaveInbox";
import { useIdleLock } from "@/hooks/useIdleLock";

type Doc = { id: string; title: string; url: string; category: string | null; notes: string | null };
type Vid = { id: string; title: string; url: string; category: string | null; notes: string | null };
type Comp = { id: string; channel: string; prompt: string; output: string | null; status: string; created_at: string };
type ChatMsg = { id?: string; role: "user" | "assistant"; content: string; tokens_est?: number };
type EmpirePage = { id: string; slug: string; title: string; description: string | null; category: string | null; sort_order: number };
type EmpireAsset = { id: string; slug: string; title: string; description: string | null; category: string | null; mime_type: string | null; sort_order: number };

// rough estimate: ~4 chars per token (good enough for UI metering)
const estTokens = (s: string) => Math.ceil((s?.length ?? 0) / 4);
// soft warn at 75%, hard stop at 100% of this budget per conversation
const TOKEN_SOFT_WARN = 60_000;
const TOKEN_HARD_STOP = 80_000;

const OWNER_EMAIL = "noyes.dave@gmail.com";

export default function Boardroom() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState({ subs: 0, prompts: 0, mrr: 0 });
  const [docs, setDocs] = useState<Doc[]>([]);
  const [vids, setVids] = useState<Vid[]>([]);
  const [comps, setComps] = useState<Comp[]>([]);
  const [empirePages, setEmpirePages] = useState<EmpirePage[]>([]);
  const [empireAssets, setEmpireAssets] = useState<EmpireAsset[]>([]);
  const [activeTab, setActiveTab] = useState<string>("empire");
  const [deployingEmpire, setDeployingEmpire] = useState(false);
  const [deployResult, setDeployResult] = useState<{ repo_url?: string; actions_url?: string; pages_url?: string; workflow_name?: string; workflow_path?: string; installed_workflow?: boolean; pages_warning?: string; error?: string; trace?: string[] } | null>(null);

  // Forms
  const [doc, setDoc] = useState({ title: "", url: "", category: "", notes: "" });
  const [vid, setVid] = useState({ title: "", url: "", category: "", notes: "" });
  const [comp, setComp] = useState({ channel: "blog", prompt: "" });
  const [composing, setComposing] = useState(false);

  // Create (multi-turn chat with Unicorn brain)
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const totalTokens = chat.reduce((sum, m) => sum + (m.tokens_est ?? estTokens(m.content)), 0);
  const tokenPct = Math.min(100, Math.round((totalTokens / TOKEN_HARD_STOP) * 100));
  const tokenStopped = totalTokens >= TOKEN_HARD_STOP;
  const tokenWarn = totalTokens >= TOKEN_SOFT_WARN && !tokenStopped;

  // Auto-lock after 10 min idle — kicks back to /auth
  useIdleLock(10, () => {
    signOut().then(() => navigate("/auth"));
  });

  // noindex Boardroom routes
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex,nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/auth"); return; }
    if (user.email?.toLowerCase() === OWNER_EMAIL) {
      setIsAdmin(true);
      loadAll();
      return;
    }

    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = !!roles?.some(r => r.role === "admin");
      setIsAdmin(admin);
      if (admin) loadAll();
    })();
  }, [user, loading, navigate]);

  const loadAll = async () => {
    const [s, p, d, v, c] = await Promise.all([
      supabase.from("subscriptions").select("id, status, current_period_end", { count: "exact", head: false }).eq("status", "active"),
      supabase.from("prompts").select("id", { count: "exact", head: true }),
      supabase.from("boardroom_documents").select("*").order("created_at", { ascending: false }),
      supabase.from("boardroom_videos").select("*").order("created_at", { ascending: false }),
      supabase.from("ai_compositions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setStats({ subs: s.data?.length ?? 0, prompts: p.count ?? 0, mrr: (s.data?.length ?? 0) * 27 });
    setDocs((d.data as Doc[]) ?? []);
    setVids((v.data as Vid[]) ?? []);
    setComps((c.data as Comp[]) ?? []);
    loadChat();
    loadEmpire();
  };

  const loadEmpire = async () => {
    const [pg, as] = await Promise.all([
      supabase.from("boardroom_pages").select("id, slug, title, description, category, sort_order").order("sort_order"),
      supabase.from("boardroom_assets").select("id, slug, title, description, category, mime_type, sort_order").order("sort_order"),
    ]);
    setEmpirePages((pg.data as EmpirePage[]) ?? []);
    setEmpireAssets((as.data as EmpireAsset[]) ?? []);
  };

  const loadChat = async () => {
    setChatLoading(true);
    try {
      const { data, error } = await supabase
        .from("boardroom_chat_messages")
        .select("id, role, content, tokens_est")
        .order("created_at", { ascending: true });
      if (error) throw error;
      setChat(((data ?? []) as any[]).map(r => ({ id: r.id, role: r.role, content: r.content, tokens_est: r.tokens_est })));
    } catch (e) {
      console.error("loadChat error:", e);
    } finally {
      setChatLoading(false);
    }
  };

  const addDoc = async () => {
    if (!doc.title || !doc.url) return toast.error("Title and URL required");
    const { error } = await supabase.from("boardroom_documents").insert({ ...doc, created_by: user!.id });
    if (error) { console.error("addDoc error:", error); return toast.error("Failed to save — please try again."); }
    setDoc({ title: "", url: "", category: "", notes: "" }); loadAll(); toast.success("Saved");
  };
  const addVid = async () => {
    if (!vid.title || !vid.url) return toast.error("Title and URL required");
    const { error } = await supabase.from("boardroom_videos").insert({ ...vid, created_by: user!.id });
    if (error) { console.error("addVid error:", error); return toast.error("Failed to save — please try again."); }
    setVid({ title: "", url: "", category: "", notes: "" }); loadAll(); toast.success("Saved");
  };
  const delDoc = async (id: string) => { await supabase.from("boardroom_documents").delete().eq("id", id); loadAll(); };
  const delVid = async (id: string) => { await supabase.from("boardroom_videos").delete().eq("id", id); loadAll(); };

  const compose = async () => {
    if (!comp.prompt) return toast.error("Add a prompt");
    setComposing(true);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: `Channel: ${comp.channel}. Write content for: ${comp.prompt}`, skill: "content-engine" },
      });
      if (error) throw error;
      const output = data?.response ?? "";
      await supabase.from("ai_compositions").insert({ channel: comp.channel, prompt: comp.prompt, output, status: "draft", created_by: user!.id });
      setComp({ channel: comp.channel, prompt: "" }); loadAll(); toast.success("Drafted");
    } catch (e: any) { console.error("compose error:", e); toast.error("Content generation failed — please try again."); }
    finally { setComposing(false); }
  };

  const sendChat = async () => {
    const text = chatInput.trim();
    if (!text || chatSending) return;
    if (tokenStopped) {
      toast.error("Conversation budget reached. Clear the chat to start fresh.");
      return;
    }

    const userTokens = estTokens(text);
    const userMsg: ChatMsg = { role: "user", content: text, tokens_est: userTokens };
    const next: ChatMsg[] = [...chat, userMsg];
    setChat(next);
    setChatInput("");
    setChatSending(true);

    // Persist user turn (best-effort) and capture id
    let userId: string | undefined;
    try {
      const { data: ins } = await supabase
        .from("boardroom_chat_messages")
        .insert({ user_id: user!.id, role: "user", content: text, tokens_est: userTokens })
        .select("id")
        .maybeSingle();
      userId = ins?.id;
      if (userId) {
        setChat(prev => prev.map((m, i) => (i === prev.length - 1 ? { ...m, id: userId } : m)));
      }
    } catch (e) { console.warn("persist user turn failed:", e); }

    try {
      const transcript = next.map(m => `${m.role === "user" ? "Dave" : "Unicorn"}: ${m.content}`).join("\n\n");
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: {
          prompt: `You are co-creating with Dave inside the Boardroom. Continue this conversation naturally, ask clarifying questions when useful, and produce concrete output (copy, plans, code, ideas) on request.\n\n${transcript}\n\nUnicorn:`,
          skill: "content-engine",
        },
      });
      if (error) throw error;
      const reply = (data?.response ?? "").trim() || "(no response)";
      const replyTokens = estTokens(reply);
      const assistantMsg: ChatMsg = { role: "assistant", content: reply, tokens_est: replyTokens };
      const after = [...next, assistantMsg];
      setChat(after);

      // Persist assistant turn
      try {
        const { data: insA } = await supabase
          .from("boardroom_chat_messages")
          .insert({ user_id: user!.id, role: "assistant", content: reply, tokens_est: replyTokens })
          .select("id")
          .maybeSingle();
        if (insA?.id) {
          setChat(prev => prev.map((m, i) => (i === prev.length - 1 ? { ...m, id: insA.id } : m)));
        }
      } catch (e) { console.warn("persist assistant turn failed:", e); }

      // Post-turn warnings
      const newTotal = after.reduce((s, m) => s + (m.tokens_est ?? 0), 0);
      if (newTotal >= TOKEN_HARD_STOP) {
        toast.error("Budget reached — chat paused. Clear to start a fresh conversation.");
      } else if (newTotal >= TOKEN_SOFT_WARN) {
        toast.warning(`Heads up: this conversation is getting long (~${newTotal.toLocaleString()} tokens). Consider clearing soon.`);
      }
    } catch (e: any) {
      console.error("chat error:", e);
      toast.error("Unicorn brain didn't respond — try again.");
      setChat(next);
    } finally {
      setChatSending(false);
    }
  };

  const clearChat = async () => {
    if (!confirm("Clear the entire saved Create chat? This deletes all turns from your account.")) return;
    try {
      await supabase.from("boardroom_chat_messages").delete().eq("user_id", user!.id);
      setChat([]);
      toast.success("Chat cleared");
    } catch (e) { console.error("clearChat error:", e); toast.error("Failed to clear"); }
  };

  const deployEmpireToGithub = async () => {
    if (deployingEmpire) return;
    if (!confirm("Deploy the current Empire code from GitHub Actions now?")) return;
    setDeployingEmpire(true);
    setDeployResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("empire-github-deploy", { body: { ref: "main" } });
      if (error || !data?.ok) throw new Error(data?.error ?? error?.message ?? "deploy failed");
      setDeployResult(data);
      toast.success("GitHub deployment started");
      if (data.actions_url) window.open(data.actions_url, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "GitHub deploy failed";
      setDeployResult({ error: msg });
      toast.error(msg);
    } finally {
      setDeployingEmpire(false);
    }
  };

  if (loading || isAdmin === null) return <main className="min-h-screen bg-background grid place-items-center text-foreground">Loading…</main>;

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-4 text-foreground">
        <Card className="max-w-md p-8 text-center glass-strong">
          <Crown className="h-10 w-10 mx-auto mb-3 text-primary" />
          <h1 className="text-2xl font-bold mb-2">Boardroom is admin-only</h1>
          <p className="text-sm text-muted-foreground mb-4">Your account ({user?.email}) is signed in but not an admin yet.</p>
          <p className="text-xs text-muted-foreground mb-4">Ask Lovable to grant your user the <code>admin</code> role (one-time data insert).</p>
          <div className="flex gap-2 justify-center">
            <Button asChild variant="outline"><Link to="/">Home</Link></Button>
            <Button onClick={() => signOut().then(() => navigate("/auth"))}><LogOut className="h-4 w-4 mr-1" />Sign out</Button>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between gap-3 glass-strong sticky top-0 z-50 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-gradient-emerald">The Boardroom</h1>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button size="sm" onClick={deployEmpireToGithub} disabled={deployingEmpire} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
            {deployingEmpire ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
            Deploy Empire
          </Button>
          <Button asChild variant="outline" size="sm"><Link to="/boardroom/legal">Legal</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/boardroom/security">Security</Link></Button>
          <Button asChild variant="outline" size="sm" className="border-red-500/40"><Link to="/boardroom/ani-provider">Ani · Provider</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/boardroom/ani-ledger">Ani · Ledger</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/">Site</Link></Button>
          <Button size="sm" variant="ghost" onClick={() => signOut().then(() => navigate("/"))}><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>

      <section className="px-6 py-6 grid sm:grid-cols-3 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">Active Subs</div><div className="text-3xl font-bold text-primary">{stats.subs}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Est. MRR</div><div className="text-3xl font-bold text-primary">${stats.mrr}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">Prompts (all-time)</div><div className="text-3xl font-bold text-primary">{stats.prompts}</div></Card>
      </section>

      <section className="px-6 pb-2">
        <Card className="p-4 border-destructive/50 bg-card">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-bold uppercase tracking-wider">GitHub / Empire deploy checklist</h2>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="border-destructive/40">
                <Link to="/ide"><Rocket className="h-4 w-4 mr-1" />Empire IDE</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="border-destructive/40">
                <Link to="/boardroom/empire-pr"><GitPullRequest className="h-4 w-4 mr-1" />Empire GitHub</Link>
              </Button>
              <Button size="sm" onClick={deployEmpireToGithub} disabled={deployingEmpire} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold">
                {deployingEmpire ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Rocket className="h-4 w-4 mr-1" />}
                Deploy Empire
              </Button>
            </div>
          </div>
          <ul className="grid sm:grid-cols-2 gap-1.5 text-sm">
            <li className="flex items-center gap-2"><Rocket className="h-4 w-4 text-destructive shrink-0" /><span>Deploy Empire → triggers GitHub Actions Pages workflow</span></li>
            <li className="flex items-center gap-2"><GitPullRequest className="h-4 w-4 text-destructive shrink-0" /><span>Empire GitHub → Ani pushes owner-approved site code</span></li>
            <li className="flex items-center gap-2"><Rocket className="h-4 w-4 text-destructive shrink-0" /><span>Empire IDE → users build, run microVM, deploy</span></li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-destructive shrink-0" /><span>Paddle billing wired (10 free builds → $27/mo)</span></li>
          </ul>
          {deployingEmpire && <div className="mt-3 text-xs text-muted-foreground">Deploy trigger running…</div>}
          {deployResult && (
            <div className="mt-3 text-xs text-muted-foreground space-y-1 rounded-md border border-border bg-background/60 p-3">
              {deployResult.error && <div className="text-destructive">Deploy error: {deployResult.error}</div>}
              {deployResult.workflow_name && <div>Workflow: <span className="text-foreground">{deployResult.workflow_name}</span></div>}
              {deployResult.workflow_path && <div>Workflow file: <span className="text-foreground">{deployResult.workflow_path}</span></div>}
              {deployResult.installed_workflow && <div className="text-destructive">Deploy workflow installed/verified.</div>}
              {deployResult.pages_warning && <div className="text-destructive">{deployResult.pages_warning}</div>}
              {deployResult.actions_url && <div><a className="text-destructive underline" href={deployResult.actions_url} target="_blank" rel="noreferrer">Open GitHub Actions run</a></div>}
              {deployResult.repo_url && <div><a className="text-destructive underline" href={deployResult.repo_url} target="_blank" rel="noreferrer">Open Empire repo</a></div>}
              {deployResult.pages_url && <div><a className="text-destructive underline" href={deployResult.pages_url} target="_blank" rel="noreferrer">Open live Pages site</a></div>}
              {!!deployResult.trace?.length && (
                <div className="pt-2 space-y-1">
                  <div className="uppercase tracking-wider text-[10px] text-muted-foreground">Deploy trace</div>
                  {deployResult.trace.map((step) => <div key={step}>• {step}</div>)}
                </div>
              )}
            </div>
          )}
        </Card>
      </section>

      <section className="px-6 pb-12">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="w-full overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-max min-w-full gap-1">
              <TabsTrigger value="empire"><Building2 className="h-4 w-4 mr-1" />Empire</TabsTrigger>
              <TabsTrigger value="learning"><Brain className="h-4 w-4 mr-1" />Learning</TabsTrigger>
              <TabsTrigger value="monitor"><Radio className="h-4 w-4 mr-1" />Monitor</TabsTrigger>
              <TabsTrigger value="media"><ImageIcon className="h-4 w-4 mr-1" />Media</TabsTrigger>
              <TabsTrigger value="sandbox"><Layout className="h-4 w-4 mr-1" />Sandbox</TabsTrigger>
              <TabsTrigger value="defense"><Shield className="h-4 w-4 mr-1" />Defense</TabsTrigger>
              <TabsTrigger value="fleet"><Factory className="h-4 w-4 mr-1" />Fleet</TabsTrigger>
              <TabsTrigger value="founder"><ListChecks className="h-4 w-4 mr-1" />Founder</TabsTrigger>
              <TabsTrigger value="compose"><Sparkles className="h-4 w-4 mr-1" />Compose</TabsTrigger>
              <TabsTrigger value="docs"><FileText className="h-4 w-4 mr-1" />Docs</TabsTrigger>
              <TabsTrigger value="videos"><Video className="h-4 w-4 mr-1" />Videos</TabsTrigger>
              <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-1" />Stats</TabsTrigger>
              <TabsTrigger value="renewal"><Phone className="h-4 w-4 mr-1" />Renewal</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="empire" className="mt-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Files & Portfolios</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {empireAssets.map(a => (
                  <Link key={a.id} to={`/boardroom/empire/asset/${a.slug}`}>
                    <Card className="p-3 hover:border-primary/60 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center shrink-0">
                          <FileDown className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold truncate">{a.title}</div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          {a.category && <div className="text-[10px] uppercase tracking-wide text-primary/80">{a.category}</div>}
                          {a.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.description}</div>}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
                {empireAssets.length === 0 && <p className="text-sm text-muted-foreground">No files yet.</p>}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 mt-2">Cloned Pages (editable)</h2>
              <div className="grid sm:grid-cols-2 gap-2">
                {empirePages.map(p => (
                  <Link key={p.id} to={`/boardroom/empire/page/${p.slug}`}>
                    <Card className="p-3 hover:border-primary/60 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-semibold truncate">{p.title}</div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                          {p.category && <div className="text-[10px] uppercase tracking-wide text-primary/80">{p.category}</div>}
                          {p.description && <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{p.description}</div>}
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={() => { setActiveTab("defense"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-left"
                >
                  <Card className="p-3 hover:border-primary/60 transition-colors cursor-pointer border-primary/40">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-md bg-primary/10 grid place-items-center shrink-0">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-semibold truncate">The Empire's Defense Department</div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-primary/80">Top-Secret · Sentinel-V</div>
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">Procurement Intelligence OS — federal contract discovery + Go/No-Go AI scoring. Security & legal wrapped.</div>
                      </div>
                    </div>
                  </Card>
                </button>
                {empirePages.length === 0 && <p className="text-sm text-muted-foreground">No pages yet.</p>}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sandbox" className="mt-4">
            <UnicornSandbox />
          </TabsContent>

          <TabsContent value="learning" className="mt-4 space-y-4">
            <AniDaveInbox />
            <LearningStackPanel />
          </TabsContent>

          <TabsContent value="monitor" className="mt-4">
            <AniLiveMonitor />
          </TabsContent>

          <TabsContent value="media" className="mt-4">
            <AniMediaStudio />
          </TabsContent>

          <TabsContent value="defense" className="mt-4">
            <DefenseGate>
              <DefenseDepartment />
            </DefenseGate>
          </TabsContent>

          <TabsContent value="fleet" className="mt-4">
            <FleetDirectory />
          </TabsContent>

          <TabsContent value="founder" className="mt-4">
            <FounderChecklist />
          </TabsContent>

          <TabsContent value="compose" className="mt-4 space-y-4">
            <Tabs defaultValue="draft">
              <TabsList className="grid grid-cols-2 w-full max-w-sm">
                <TabsTrigger value="draft"><Sparkles className="h-4 w-4 mr-1" />Draft</TabsTrigger>
                <TabsTrigger value="create"><MessageCircle className="h-4 w-4 mr-1" />Create</TabsTrigger>
              </TabsList>

              <TabsContent value="draft" className="mt-4 space-y-4">
                <Card className="p-4 space-y-3">
                  <div className="grid sm:grid-cols-4 gap-2">
                    <div className="sm:col-span-1">
                      <Label>Channel</Label>
                      <select className="w-full h-10 px-3 rounded-md border border-border bg-background text-foreground" value={comp.channel} onChange={e => setComp({ ...comp, channel: e.target.value })}>
                        <option value="blog">Blog</option><option value="email">Email</option>
                        <option value="reddit">Reddit</option><option value="bluesky">Bluesky</option>
                        <option value="twitter">X/Twitter</option><option value="social-image">Social image blurb</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <Label>Prompt</Label>
                      <Textarea rows={3} value={comp.prompt} onChange={e => setComp({ ...comp, prompt: e.target.value })} placeholder="e.g. Announce Unicorn Box™ launch with a hook for indie founders" />
                    </div>
                  </div>
                  <Button onClick={compose} disabled={composing}>{composing ? "Drafting…" : "Generate Draft"}</Button>
                  <p className="text-xs text-muted-foreground">Drafts save here. Auto-posting to Reddit/Bluesky/Email comes in Phase 2 once those connectors are added.</p>
                </Card>
                <div className="space-y-2">
                  {comps.map(c => (
                    <Card key={c.id} className="p-3">
                      <div className="text-xs text-muted-foreground flex justify-between"><span>{c.channel} · {c.status}</span><span>{new Date(c.created_at).toLocaleString()}</span></div>
                      <div className="text-sm font-semibold mt-1">{c.prompt}</div>
                      {c.output && <pre className="whitespace-pre-wrap text-xs mt-2 bg-muted/30 p-2 rounded">{c.output}</pre>}
                    </Card>
                  ))}
                  {comps.length === 0 && <p className="text-sm text-muted-foreground">No drafts yet.</p>}
                </div>
              </TabsContent>

              <TabsContent value="create" className="mt-4 space-y-3">
                <Card className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold flex items-center gap-1"><MessageCircle className="h-4 w-4 text-primary" />Talk with the Unicorn brain</div>
                      <p className="text-xs text-muted-foreground">Brainstorm, develop, refine. Saved to your account — picks up where you left off.</p>
                    </div>
                    {chat.length > 0 && (
                      <Button size="sm" variant="ghost" onClick={clearChat}><Eraser className="h-3 w-3 mr-1" />Clear</Button>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className={tokenStopped ? "text-destructive font-semibold" : tokenWarn ? "text-primary font-semibold" : "text-muted-foreground"}>
                        Conversation budget: {totalTokens.toLocaleString()} / {TOKEN_HARD_STOP.toLocaleString()} tokens
                      </span>
                      <span className="text-muted-foreground">{tokenPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all ${tokenStopped ? "bg-destructive" : tokenWarn ? "bg-primary" : "bg-primary/60"}`}
                        style={{ width: `${tokenPct}%` }}
                      />
                    </div>
                    {tokenStopped && (
                      <p className="text-[11px] text-destructive">Budget reached — chat paused to control cost. Clear to start fresh.</p>
                    )}
                    {tokenWarn && !tokenStopped && (
                      <p className="text-[11px] text-primary">Heads up: long conversation. Each new turn costs more.</p>
                    )}
                  </div>

                  <div className="min-h-[240px] max-h-[480px] overflow-y-auto space-y-3 rounded-md border border-border bg-muted/20 p-3">
                    {chatLoading && <p className="text-xs text-muted-foreground text-center py-8">Loading saved chat…</p>}
                    {!chatLoading && chat.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-8">Start the conversation. e.g. "Help me develop the Unicorn Box™ launch sequence — emails, Reddit hook, landing copy."</p>
                    )}
                    {chat.map((m, i) => (
                      <div key={m.id ?? i} className={m.role === "user" ? "text-right" : "text-left"}>
                        <div className={`inline-block max-w-[90%] text-sm rounded-2xl px-3 py-2 whitespace-pre-wrap ${m.role === "user" ? "bg-primary/15 text-foreground" : "bg-card border border-border text-foreground"}`}>
                          {m.content}
                        </div>
                      </div>
                    ))}
                    {chatSending && <div className="text-xs text-muted-foreground italic">Unicorn is thinking…</div>}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      rows={2}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendChat(); } }}
                      placeholder={tokenStopped ? "Budget reached — clear chat to continue." : "Talk to Unicorn… (Cmd/Ctrl+Enter to send)"}
                      disabled={tokenStopped}
                      className="flex-1"
                    />
                    <Button onClick={sendChat} disabled={chatSending || !chatInput.trim() || tokenStopped}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="docs" className="mt-4 space-y-4">
            <Card className="p-4 grid sm:grid-cols-2 gap-2">
              <Input placeholder="Title" value={doc.title} onChange={e => setDoc({ ...doc, title: e.target.value })} />
              <Input placeholder="URL" value={doc.url} onChange={e => setDoc({ ...doc, url: e.target.value })} />
              <Input placeholder="Category" value={doc.category} onChange={e => setDoc({ ...doc, category: e.target.value })} />
              <Input placeholder="Notes" value={doc.notes} onChange={e => setDoc({ ...doc, notes: e.target.value })} />
              <Button onClick={addDoc} className="sm:col-span-2">Save Document</Button>
            </Card>
            {docs.map(d => (
              <Card key={d.id} className="p-3 flex justify-between items-center">
                <div><div className="font-semibold">{d.title} <span className="text-xs text-muted-foreground">{d.category}</span></div><div className="text-xs text-muted-foreground">{d.notes}</div></div>
                <div className="flex gap-1"><Button asChild size="sm" variant="outline"><a href={d.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button><Button size="sm" variant="ghost" onClick={() => delDoc(d.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="videos" className="mt-4 space-y-4">
            <Card className="p-4 grid sm:grid-cols-2 gap-2">
              <Input placeholder="Title" value={vid.title} onChange={e => setVid({ ...vid, title: e.target.value })} />
              <Input placeholder="URL" value={vid.url} onChange={e => setVid({ ...vid, url: e.target.value })} />
              <Input placeholder="Category" value={vid.category} onChange={e => setVid({ ...vid, category: e.target.value })} />
              <Input placeholder="Notes" value={vid.notes} onChange={e => setVid({ ...vid, notes: e.target.value })} />
              <Button onClick={addVid} className="sm:col-span-2">Save Video</Button>
            </Card>
            {vids.map(v => (
              <Card key={v.id} className="p-3 flex justify-between items-center">
                <div><div className="font-semibold">{v.title} <span className="text-xs text-muted-foreground">{v.category}</span></div><div className="text-xs text-muted-foreground">{v.notes}</div></div>
                <div className="flex gap-1"><Button asChild size="sm" variant="outline"><a href={v.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a></Button><Button size="sm" variant="ghost" onClick={() => delVid(v.id)}><Trash2 className="h-3 w-3" /></Button></div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <Card className="p-4 text-sm text-muted-foreground">Live numbers above. Marketing analytics (Reddit/Bluesky reach, email opens) light up in Phase 2 with connectors.</Card>
          </TabsContent>

          <TabsContent value="renewal" className="mt-4">
            <Card className="p-5 space-y-3">
              <div>
                <h3 className="text-lg font-semibold">Renewal &amp; Expansion Agent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Voice test the live ElevenLabs agent. Same agent that subscribers reach from <code>/account</code>.
                </p>
              </div>
              <RenewalAgentButton label="Start test call" />
              <p className="text-xs text-muted-foreground">
                Agent ID: <code>agent_4401krcad257fkat1jpqskm9209v</code>
              </p>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
