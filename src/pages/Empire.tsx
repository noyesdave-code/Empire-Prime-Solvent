import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Loader2, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useJsonLd } from "@/hooks/useJsonLd";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatImageGallery, ChatVideoLinks, extractMarkdownMedia } from "@/components/ChatImageGallery";
import { PennyTipButton } from "@/components/PennyTipButton";

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

export default function Empire() {
  const { user, loading: authLoading } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);
  const [aniMsgs, setAniMsgs] = useState<Msg[]>([]);
  const [turnsUsed, setTurnsUsed] = useState(0);
  const aniScroll = useRef<HTMLDivElement | null>(null);

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
    setSent(text);
    setPrompt("");
    setLoading(true);
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

      <section className="flex-1 mx-auto w-full max-w-6xl px-4 pb-6 grid gap-5 grid-rows-3" style={{ minHeight: "calc(100vh - 220px)" }}>
        <div className="flex flex-col p-6 min-h-0" style={boxBase}>
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
            className="flex-1 w-full resize-none rounded-xl px-4 py-4 text-lg focus:outline-none focus:ring-2"
            style={{
              background: JET,
              color: WHITE,
              border: `3px solid ${PURPLE_SOFT}`,
              minHeight: 140,
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

        <div className="flex flex-col p-6 min-h-0" style={boxBase}>
          <div className="text-xs uppercase tracking-[0.3em] mb-3 font-bold" style={{ color: PURPLE }}>
            Your prompt
          </div>
          <div className="flex-1 overflow-y-auto text-lg whitespace-pre-wrap" style={{ color: WHITE }}>
            {sent || <span style={{ color: DIM, fontStyle: "italic" }}>Your sent prompt appears here.</span>}
          </div>
        </div>

        <div className="flex flex-col p-6 min-h-0" style={boxBase}>
          <div className="text-xs uppercase tracking-[0.3em] mb-3 font-bold" style={{ color: PURPLE }}>
            Ani
          </div>
          <div ref={aniScroll} className="flex-1 overflow-y-auto space-y-3">
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


      <div className="py-6 px-5 text-center">
        <PennyTipButton />
        <div className="text-[10px] mt-2" style={{ color: DIM }}>
          Tips fuel Ani's research. 100% goes to the jar. Withdrawable any time.
        </div>
      </div>

      <footer className="py-4 px-5 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: DIM }}>
        © {new Date().getFullYear()} PGVA Ventures LLC ·{" "}
        <a href="/terms" className="hover:underline" style={{ color: PURPLE_SOFT }}>Terms</a> ·{" "}
        <a href="/privacy" className="hover:underline" style={{ color: PURPLE_SOFT }}>Privacy</a>
      </footer>
    </main>
  );
}
