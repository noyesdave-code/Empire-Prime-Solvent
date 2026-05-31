import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const JET = "#2b2b2e";
const PANEL = "#3a3a3e";
const BORDER = "#6b6b70";
const ACCENT = "#b5b5b8";
const ACCENT_SOFT = "#d4d4d8";
const WHITE = "#f4f4f5";
const MUTED = "#b5b5b8";
const DIM = "#8a8a8d";

export default function Index() {
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const scroll = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scroll.current?.scrollTo({ top: scroll.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  const send = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setSent(text);
    setPrompt("");
    setLoading(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { role: "assistant", content: "Brain connecting soon." }]);
      setLoading(false);
    }, 600);
  };

  const boxBase: React.CSSProperties = {
    background: PANEL,
    border: `3px solid ${BORDER}`,
    borderRadius: 16,
  };

  return (
    <main className="min-h-screen flex flex-col" style={{ background: JET, color: WHITE }}>
      <header className="pt-6 pb-4 text-center">
        <h1
          className="font-extrabold tracking-tight leading-none"
          style={{ color: ACCENT_SOFT, fontSize: "clamp(3rem, 12vw, 6rem)" }}
        >
          Empire.
        </h1>
      </header>

      <section
        className="flex-1 mx-auto w-full max-w-5xl px-3 pb-4 grid gap-3 grid-rows-3"
        style={{ minHeight: "calc(100vh - 200px)" }}
      >
        <div className="flex flex-col p-4 min-h-0" style={boxBase}>
          <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: ACCENT_SOFT }}>
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
            placeholder="Type your prompt for Ani… (Enter to send)"
            className="flex-1 w-full resize-none rounded-lg px-3 py-3 text-base focus:outline-none"
            style={{ background: JET, color: WHITE, border: `3px solid ${BORDER}` }}
          />
          <div className="mt-3 flex items-center justify-end">
            <button
              onClick={send}
              disabled={loading || !prompt.trim()}
              aria-label="Send"
              className="inline-flex items-center justify-center h-11 w-11 rounded-full disabled:opacity-40 transition-transform active:scale-95"
              style={{ background: ACCENT, color: JET, border: `3px solid ${ACCENT_SOFT}` }}
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.8} />}
            </button>
          </div>
        </div>

        <div className="flex flex-col p-4 min-h-0" style={boxBase}>
          <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: ACCENT_SOFT }}>
            Your prompt
          </div>
          <div className="flex-1 overflow-y-auto text-base whitespace-pre-wrap" style={{ color: WHITE }}>
            {sent || <span style={{ color: DIM, fontStyle: "italic" }}>Your sent prompt appears here.</span>}
          </div>
        </div>

        <div className="flex flex-col p-4 min-h-0" style={boxBase}>
          <div className="text-[10px] uppercase tracking-[0.3em] mb-2" style={{ color: ACCENT_SOFT }}>
            Ani
          </div>
          <div ref={scroll} className="flex-1 overflow-y-auto space-y-3">
            {msgs.length === 0 && !loading ? (
              <div style={{ color: DIM, fontStyle: "italic" }}>Awaiting your move.</div>
            ) : (
              msgs.map((m, i) => (
                <div key={i} className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: WHITE }}>
                  {m.content}
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="py-4 px-5 text-center text-[10px] uppercase tracking-[0.3em]" style={{ color: DIM }}>
        © {new Date().getFullYear()} PGVA Ventures LLC
      </footer>
    </main>
  );
}
