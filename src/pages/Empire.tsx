import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useJsonLd } from "@/hooks/useJsonLd";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatImageGallery, ChatVideoLinks, extractMarkdownMedia } from "@/components/ChatImageGallery";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "empire_session_id_v1";
const FREE_TURN_KEY = "empire_anon_turns_v1";
const FREE_LIMIT = 10;

const JET = "#1a1a1e";
const PANEL = "#252529";
const BORDER = "#8a42ff";
const BORDER_SOFT = "#a970ff";
const PURPLE = "#b347ff";
const PURPLE_SOFT = "#d4a3ff";
const PURPLE_GLOW = "#e8ccff";
const WHITE = "#f0f0f5";
const MUTED = "#c0c0d0";
const DIM = "#9090a0";

function sid() {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto?.randomUUID?.() ?? `s_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const AUTO_PROMPTS = [
  "Research one fresh growth lever for Empire right now. Cite live sources [1][2]. Then build the next move as exact copy, component structure, and patch-ready instructions.",
  "Find one underserved customer pain this week. Cite [1][2]. Then build the exact product page, checkout hook, and CTA copy to capture it.",
  "Scan for one viral marketing angle trending in the last 7 days. Cite [1][2]. Then build the post, landing hook, and one deploy-ready experiment.",
  "Identify one competitor move in the last 30 days. Cite [1][2]. Then build our counter-move: feature, price, homepage sentence, and launch checklist.",
];

export default function Empire() {
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [aniMsgs, setAniMsgs] = useState<Msg[]>([]);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const [autoOn, setAutoOn] = useState(true);
  const aniScroll = useRef<HTMLDivElement | null>(null);
  const autoIdx = useRef(0);


  useJsonLd("empire-schema", [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Empire",
      url: "https://unicornaibuilder.lovable.app/empire",
      description: "Empire.",
    },
  ]);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(FREE_TURN_KEY) ?? "0", 10);
    setTurnsUsed(Number.isFinite(stored) ? stored : 0);
  }, []);

  useEffect(() => {
    aniScroll.current?.scrollTo({ top: aniScroll.current.scrollHeight, behavior: "smooth" });
  }, [aniMsgs, loading]);

  const gated = !user && turnsUsed >= FREE_LIMIT;
  const turnsLeft = Math.max(0, FREE_LIMIT - turnsUsed);

  const send = async () => {
    const text = prompt.trim();
    if (!text || loading || gated) return;
    setPrompt("");
    setLoading(true);
    setAniMsgs((m) => [...m, { role: "user", content: text }]);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: text, skill: "business-builder", session_id: sid() },
      });
      if (error) throw error;
      const reply = data?.response || data?.error || "Brain offline.";
      setAniMsgs((m) => [...m, { role: "assistant", content: reply }]);
      if (!user) {
        const next = turnsUsed + 1;
        setTurnsUsed(next);
        localStorage.setItem(FREE_TURN_KEY, String(next));
      }
    } catch (e) {
      setAniMsgs((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Unreachable." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runAutoTick = async () => {
    if (loading) return;
    const text = AUTO_PROMPTS[autoIdx.current % AUTO_PROMPTS.length];
    autoIdx.current += 1;
    setLoading(true);
    setAniMsgs((m) => [...m, { role: "user", content: `🤖 auto: ${text}` }]);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: text, skill: "business-builder", session_id: sid() },
      });
      if (error) throw error;
      const reply = data?.response || data?.error || "Brain offline.";
      setAniMsgs((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setAniMsgs((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Auto tick failed." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Autonomous loop — admin/auth only. Fires immediately + every 90s.
  useEffect(() => {
    if (!autoOn || !user) return;
    runAutoTick();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") runAutoTick();
    }, 90_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOn, user]);


  if (authLoading) return null;

  const boxBase: React.CSSProperties = {
    background: PANEL,
    border: `3px solid ${PURPLE}`,
    borderRadius: 20,
    boxShadow: `0 0 0 1px ${PURPLE_SOFT}44, 0 8px 40px ${PURPLE}33, inset 0 0 60px ${PURPLE}0a`,
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ background: JET, color: WHITE }}>
      <header className="pt-8 pb-6 text-center">
        <h1
          className="font-extrabold tracking-tight leading-none"
          style={{
            color: PURPLE,
            fontSize: "clamp(4rem, 16vw, 8rem)",
            letterSpacing: "0",
            textShadow: `0 0 30px ${PURPLE}88, 0 0 70px ${PURPLE}55, 0 0 120px ${PURPLE}33`,
          }}
        >
          Empire
        </h1>
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 pb-6 grid gap-5">
        <div className="flex flex-col p-6" style={boxBase}>
          <div className="text-xs uppercase tracking-[0.3em] mb-3 font-bold" style={{ color: PURPLE }}>
            Write prompt
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={4000}
            placeholder="Tell Ani what to build or research… (Enter to send)"
            className="w-full resize-none rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2"
            style={{
              background: JET,
              color: WHITE,
              border: `3px solid ${PURPLE_SOFT}`,
              height: 140,
            }}
          />
          <div className="mt-4 flex items-center justify-between">
            {!user ? (
              <span className="text-xs uppercase tracking-wider" style={{ color: PURPLE_SOFT }}>
                {turnsLeft} free turns left
              </span>
            ) : <span />}
            <button
              onClick={send}
              disabled={loading || !prompt.trim() || gated}
              aria-label="Send to Ani"
              className="inline-flex items-center justify-center h-14 w-14 rounded-full disabled:opacity-40 transition-transform active:scale-95"
              style={{ background: PURPLE, color: WHITE, border: `3px solid ${PURPLE_SOFT}`, boxShadow: `0 0 24px ${PURPLE}88` }}
            >
              {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ArrowUp className="h-6 w-6" strokeWidth={2.8} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col p-6" style={boxBase}>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs uppercase tracking-[0.3em] font-bold" style={{ color: PURPLE }}>
              Ani
            </div>
            {user && (
              <button
                onClick={() => setAutoOn((v) => !v)}
                className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md font-bold"
                style={{
                  background: autoOn ? PURPLE : "transparent",
                  color: autoOn ? WHITE : PURPLE_SOFT,
                  border: `2px solid ${PURPLE_SOFT}`,
                }}
                title="Ani researches + builds on his own every 90s"
              >
                {autoOn ? "● auto on" : "auto off"}
              </button>
            )}
          </div>
          <div ref={aniScroll} className="overflow-y-auto space-y-3" style={{ maxHeight: 360 }}>
            {aniMsgs.length === 0 && !loading ? (
              <div style={{ color: DIM, fontStyle: "italic" }}>Ani can build and research on his own. Give him the mission.</div>
            ) : (
              aniMsgs.map((m, i) => {
                const { images, videos, text } = extractMarkdownMedia(m.content);
                return (
                  <div key={i} className="text-lg leading-relaxed" style={{ color: WHITE }}>
                    <div className="prose prose-invert max-w-none prose-a:text-purple-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
                    </div>
                    <ChatImageGallery images={images} />
                    <ChatVideoLinks videos={videos} />
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex items-center gap-2 text-sm" style={{ color: PURPLE_SOFT }}>
                <Loader2 className="h-4 w-4 animate-spin" /> thinking…
              </div>
            )}
            {gated && (
              <div className="rounded-xl px-4 py-4 text-sm" style={{ background: JET, border: `3px solid ${PURPLE}` }}>
                <p className="font-bold mb-2" style={{ color: PURPLE_SOFT }}>Free turns used.</p>
                <Link
                  to="/auth?next=/empire"
                  className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold"
                  style={{ background: PURPLE, color: WHITE, border: `2px solid ${PURPLE_SOFT}` }}
                >
                  <LogIn className="h-3 w-3" /> Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-4 px-5 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: DIM }}>
        © {new Date().getFullYear()} PGVA Ventures LLC ·{" "}
        <a href="/terms" className="hover:underline" style={{ color: PURPLE_SOFT }}>Terms</a> ·{" "}
        <a href="/privacy" className="hover:underline" style={{ color: PURPLE_SOFT }}>Privacy</a>
      </footer>
    </main>
  );
}
