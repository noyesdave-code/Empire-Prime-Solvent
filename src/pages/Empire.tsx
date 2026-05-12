import { useState, useRef, useEffect } from "react";
import { ArrowUp, Loader2, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useJsonLd } from "@/hooks/useJsonLd";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "empire_session_id_v1";
function sid() {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto?.randomUUID?.() ?? `s_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function ChatBox({ title, accent }: { title: string; accent: "red" | "white" }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = prompt.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setPrompt("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: text, skill: "business-builder", session_id: sid() },
      });
      if (error) throw error;
      const reply = data?.response || data?.error || "Brain offline.";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: e instanceof Error ? e.message : "Unreachable." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const ring = accent === "red" ? "#ff1a1a" : "#ffffff";
  const glow =
    accent === "red"
      ? "0 0 40px rgba(255,26,26,0.25), inset 0 0 0 1px rgba(255,26,26,0.4)"
      : "0 0 40px rgba(255,255,255,0.10), inset 0 0 0 1px rgba(255,255,255,0.25)";

  return (
    <div
      className="flex flex-col rounded-2xl bg-black/80 backdrop-blur-xl"
      style={{ boxShadow: glow, height: 520 }}
    >
      <div
        className="px-5 py-3 text-[11px] uppercase tracking-[0.35em] font-bold border-b"
        style={{ color: ring, borderColor: `${ring}33` }}
      >
        {title}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-white/40 text-sm">Ask anything. The Empire answers.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2 ${
              m.role === "user"
                ? "bg-white/5 text-white ml-8"
                : "bg-[#1a0000] text-white/90 mr-8 border border-[#ff1a1a]/20"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" /> thinking…
          </div>
        )}
      </div>
      <div className="p-3 border-t" style={{ borderColor: `${ring}22` }}>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Speak to the Empire… (Enter = new line · Cmd/Ctrl+Enter or arrow = send)"
            rows={2}
            className="w-full resize-none rounded-xl bg-black/60 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none"
            style={{ border: `1px solid ${ring}44` }}
          />
          <button
            onClick={send}
            disabled={loading}
            aria-label="Send"
            className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-lg disabled:opacity-50 transition hover:scale-105"
            style={{ background: ring, color: accent === "red" ? "#fff" : "#000" }}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Empire() {
  useJsonLd("empire-schema", [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "The Empire",
      url: "https://unicornaibuilder.lovable.app/empire",
      description: "The Empire — a zero-trust AI fortress.",
    },
  ]);

  return (
    <div className="min-h-screen w-full bg-black text-white relative overflow-hidden">
      {/* ambient blood glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,0,0,0.25), transparent 60%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(255,0,0,0.15), transparent 60%)",
        }}
      />
      {/* subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <main className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-10 sm:pt-28">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#ff1a1a]/40 bg-[#1a0000]/60 px-3 py-1 text-[10px] uppercase tracking-[0.4em] text-[#ff5050]">
            <Shield className="h-3 w-3" /> Zero-Trust Fortress · Online
          </div>
          <h1
            className="mt-6 font-black tracking-tight leading-[0.9] text-white"
            style={{
              fontSize: "clamp(3rem, 12vw, 8rem)",
              textShadow:
                "0 0 60px rgba(255,0,0,0.35), 0 0 120px rgba(255,0,0,0.15)",
            }}
          >
            THE <span style={{ color: "#ff1a1a" }}>EMPIRE</span>
          </h1>
          <p className="mt-4 text-white/60 text-sm sm:text-base max-w-xl mx-auto">
            Twelve stacked layers. One unbreakable spine. Two minds. Speak — the Empire listens.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <ChatBox title="◤ Crimson Mind" accent="red" />
          <ChatBox title="◢ Ivory Mind" accent="white" />
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/5 mt-10 py-6 px-5 text-center text-[10px] uppercase tracking-[0.3em] text-white/40">
        © {new Date().getFullYear()} The Empire · All rights reserved ·{" "}
        <a href="/terms" className="hover:text-[#ff5050]">Terms</a> ·{" "}
        <a href="/privacy" className="hover:text-[#ff5050]">Privacy</a>
      </footer>
    </div>
  );
}
