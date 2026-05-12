import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Brain, Mail, RotateCcw, Trash2, ArrowUp, ImagePlus } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useScopedSelectAll } from "@/hooks/useScopedSelectAll";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useChatHistory } from "@/hooks/useChatHistory";
import { ChatMessageList } from "@/components/ChatMessageList";

const SESSION_KEY = "unicorn_session_id_v1";
const COUNT_KEY = "unicorn_anon_prompt_count_v1";
const EMAIL_KEY = "unicorn_anon_email_v1";
const FREE_LIMIT = 10;

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const SKILLS = [
  { slug: "business-builder", label: "Build a business" },
  { slug: "trend-scout", label: "Spot a trend" },
  { slug: "revenue-coach", label: "Fix my offer" },
  { slug: "content-engine", label: "Make content" },
];

export const AskUnicorn = () => {
  const [prompt, setPrompt] = useState("");
  const [skill, setSkill] = useState(SKILLS[0].slug);
  const [loading, setLoading] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [anonCount, setAnonCount] = useState(0);
  const [showGate, setShowGate] = useState(false);
  const [gateEmail, setGateEmail] = useState("");
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  useScopedSelectAll(shellRef, answerRef);
  const { messages, append, replaceLastAssistant, lastUserPrompt, clear, hasCheckpoint, restoreCheckpoint } = useChatHistory("askunicorn");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    const stored = parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
    setAnonCount(Number.isFinite(stored) ? stored : 0);
    return () => subscription.unsubscribe();
  }, []);

  // scroll handled inside ChatMessageList

  const remaining = Math.max(0, FREE_LIMIT - anonCount);
  const gated = !authed && anonCount >= FREE_LIMIT && !localStorage.getItem(EMAIL_KEY);

  const ask = async (overridePrompt?: string, replaceLast = false) => {
    const text = (overridePrompt ?? prompt).trim();
    if (!text || text.length > 4000) {
      toast({ title: "Add a prompt first", description: "1–4000 characters." });
      return;
    }
    if (gated) { setShowUpgrade(true); return; }

    setLoading(true);
    if (!replaceLast) append("user", text);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: text, skill, session_id: getSessionId() },
      });
      if (error) throw error;
      if (data?.paywall) {
        setShowUpgrade(true);
        return;
      }
      if (data?.error) {
        toast({ title: "Brain busy", description: data.error, variant: "destructive" });
        return;
      }
      const meta = { model: data.model, latency_ms: data.latency_ms, router_reason: data.router_reason };
      if (replaceLast) replaceLastAssistant(data.response, meta);
      else append("assistant", data.response, meta);
      if (!overridePrompt) setPrompt("");

      if (!authed) {
        const next = anonCount + 1;
        setAnonCount(next);
        localStorage.setItem(COUNT_KEY, String(next));
        if (next >= FREE_LIMIT) {
          setTimeout(() => setShowUpgrade(true), 600);
        }
      }

    } catch (e) {
      toast({
        title: "Brain unreachable",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const askImage = async () => {
    const text = prompt.trim();
    if (!text || text.length > 2000) {
      toast({ title: "Describe the image", description: "1–2000 characters." });
      return;
    }
    if (gated) { setShowUpgrade(true); return; }
    setLoading(true);
    append("user", `🖼️ ${text}`);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-image", {
        body: { prompt: text, session_id: getSessionId() },
      });
      if (error) throw error;
      if (data?.paywall) { setShowUpgrade(true); return; }
      if (data?.error || !data?.images?.length) {
        toast({ title: "Image brain busy", description: data?.error ?? "No image returned.", variant: "destructive" });
        return;
      }
      const md = (data.images as string[])
        .map((src, i) => `![${text.replace(/[\[\]\(\)]/g, "").slice(0, 80)} ${i + 1}](${src})`)
        .join("\n\n");
      append("assistant", md, { model: data.model, latency_ms: data.latency_ms });
      setPrompt("");
      if (!authed) {
        const next = anonCount + 1;
        setAnonCount(next);
        localStorage.setItem(COUNT_KEY, String(next));
      }
    } catch (e) {
      toast({
        title: "Image brain unreachable",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enter inserts a blank line (paragraph break). Submit only via the arrow button.
  const onTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    // Allow IME composition to insert naturally
    if ((e.nativeEvent as any).isComposing) return;
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? prompt.length;
    const end = el.selectionEnd ?? prompt.length;
    const insert = "\n\n";
    const next = prompt.slice(0, start) + insert + prompt.slice(end);
    setPrompt(next);
    requestAnimationFrame(() => {
      const pos = start + insert.length;
      el.selectionStart = el.selectionEnd = pos;
      el.scrollTop = el.scrollHeight;
    });
  };

  const submitGateEmail = async () => {
    const email = gateEmail.trim().toLowerCase();
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
    if (!valid) {
      toast({ title: "Enter a valid email", variant: "destructive" });
      return;
    }
    setGateSubmitting(true);
    try {
      // Best-effort capture: insert as a draft profile-style lead via a public-safe table.
      // We piggy-back on `prompts` (anon insert allowed) by stamping the email into the prompt.
      await supabase.from("prompts").insert({
        prompt: `[lead-capture] ${email}`,
        source: "lead-gate",
        session_id: getSessionId(),
      });
      localStorage.setItem(EMAIL_KEY, email);
      setShowGate(false);
      toast({ title: "You're in 💚", description: "Keep asking — your spot is saved." });
    } catch (e) {
      // Even if logging fails, let them continue — we have the email locally.
      localStorage.setItem(EMAIL_KEY, email);
      setShowGate(false);
      toast({ title: "You're in 💚", description: "Keep asking." });
    } finally {
      setGateSubmitting(false);
    }
  };

  const showCounter = !authed && anonCount < FREE_LIMIT && !localStorage.getItem(EMAIL_KEY);

  return (
    <section className="relative z-10 mx-auto max-w-4xl px-6 pb-10">
      <div ref={shellRef} className="relative rounded-2xl border-[3px] border-primary bg-card p-4 md:p-6 unicorn-chat-shell">
          <div className="mb-2 flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <p className="text-xs uppercase tracking-[0.25em] text-fluoro-white font-semibold">
              AI pricing starts at Sparks $9/mo
            </p>
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold mb-4 text-fluoro-white">
            Ask <span className="text-gradient-emerald">Unicorn Sparks</span>
          </h2>

          {showCounter && (
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold glass border border-[hsl(var(--emerald-glow))/40]">
              <Sparkles className="h-3 w-3 text-[hsl(var(--emerald-glow))]" />
              <span className="text-fluoro">
                {remaining} free {remaining === 1 ? "question" : "questions"} remaining
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            {SKILLS.map((s) => (
              <button
                key={s.slug}
                onClick={() => setSkill(s.slug)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  skill === s.slug
                    ? "bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--emerald)/0.7)]"
                    : "glass text-fluoro hover:scale-105"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          {messages.length > 0 && (
            <div className="mb-4 rounded-xl glass p-4 border-2 border-[hsl(var(--emerald-glow))] shadow-[0_0_24px_hsl(var(--emerald)/0.5)]">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-widest text-fluoro-gold">Conversation</span>
                <div className="flex items-center gap-1">
                  {hasCheckpoint && (
                    <button onClick={restoreCheckpoint} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] hover:bg-white/10" title="Restore last checkpoint">
                      <RotateCcw className="h-3 w-3" /> Restore
                    </button>
                  )}
                  <button onClick={clear} className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] hover:bg-white/10" title="Clear chat">
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
              </div>
              <ChatMessageList
                messages={messages}
                loading={loading}
                scrollRef={answerRef}
                onRegenerate={() => {
                  const last = lastUserPrompt();
                  if (last) ask(last, true);
                }}
              />
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onTextareaKeyDown}
            placeholder={imageMode
              ? "Describe the image — e.g. retro arcade unicorn neon poster, cinematic lighting"
              : "e.g. I want to launch a niche newsletter for indie game devs — give me the 7-day plan."}
            rows={4}
            maxLength={4000}
            className="unicorn-chat-input"
          />

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-fluoro-gold">
                {prompt.length}/4000 · Enter = new paragraph · Arrow = send
              </span>
              <button
                onClick={() => setImageMode((v) => !v)}
                aria-pressed={imageMode}
                className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  imageMode
                    ? "bg-gradient-to-r from-[hsl(var(--accent))] to-[hsl(var(--maroon))] text-background shadow-[0_0_16px_hsl(var(--accent)/0.7)]"
                    : "glass text-fluoro hover:scale-105 border border-[hsl(var(--emerald-glow))/40]"
                }`}
                title={imageMode ? "Switch to text reply" : "Generate an image instead"}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {imageMode ? "Image mode ON" : "Generate image"}
              </button>
            </div>
            <button
              onClick={() => (imageMode ? askImage() : ask())}
              disabled={loading || !prompt.trim()}
              aria-label={imageMode ? "Generate image" : "Send to Unicorn Sparks"}
              title={imageMode ? "Generate image" : "Send to Unicorn Sparks"}
              className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-[hsl(var(--emerald))] via-[hsl(var(--accent))] to-[hsl(var(--maroon))] text-background disabled:opacity-50 hover:scale-110 active:scale-95 transition-transform shadow-[0_0_40px_hsl(var(--emerald)/0.85)] ring-2 ring-[hsl(var(--emerald-glow))]"
            >
              {loading ? (
                <Loader2 className="h-7 w-7 animate-spin" />
              ) : imageMode ? (
                <ImagePlus className="h-8 w-8" strokeWidth={2.5} />
              ) : (
                <ArrowUp className="h-8 w-8" strokeWidth={3} />
              )}
            </button>
          </div>

          {showGate && (
            <div className="fixed inset-0 z-[100] grid place-items-center bg-background/80 backdrop-blur-sm px-4">
              <div className="w-full max-w-md rounded-3xl p-[2px] bg-gradient-to-br from-[hsl(var(--emerald))] via-[hsl(var(--accent))] to-[hsl(var(--maroon))] shadow-[0_0_60px_hsl(var(--emerald)/0.5)]">
                <div className="glass-strong rounded-3xl p-6 bg-background/90">
                  <div className="flex items-center gap-2 mb-3">
                    <Mail className="h-5 w-5 text-[hsl(var(--emerald-glow))]" />
                    <h3 className="text-lg font-bold text-fluoro-white">You used your 10 free questions 🦄</h3>
                  </div>
                  <p className="text-sm text-fluoro mb-4">
                    Drop your email to keep asking the Unicorn brain — free, no card. Or create a full account for unlimited prompts on a paid tier.
                  </p>
                  <input
                    type="email"
                    value={gateEmail}
                    onChange={(e) => setGateEmail(e.target.value)}
                    placeholder="you@yourempire.com"
                    autoFocus
                    maxLength={255}
                    className="w-full mb-3 rounded-xl px-4 py-3 bg-background/60 border border-[hsl(var(--emerald-glow))/40] text-fluoro placeholder:text-fluoro/40 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--emerald-glow))]"
                    onKeyDown={(e) => { if (e.key === "Enter") submitGateEmail(); }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={submitGateEmail}
                      disabled={gateSubmitting || !gateEmail.trim()}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold bg-gradient-to-r from-[hsl(var(--emerald))] via-[hsl(var(--accent))] to-[hsl(var(--maroon))] text-background disabled:opacity-50 hover:scale-[1.02] transition-transform"
                    >
                      {gateSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Continue free
                    </button>
                    <Link
                      to="/auth"
                      className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold glass text-fluoro hover:scale-[1.02] transition-transform"
                    >
                      Sign in
                    </Link>
                  </div>
                  <p className="mt-3 text-[10px] text-center text-fluoro/60">
                    We'll only email you Unicorn updates. Unsubscribe any time.
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} cap={FREE_LIMIT} />
    </section>
  );
};
