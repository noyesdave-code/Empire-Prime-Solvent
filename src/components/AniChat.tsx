import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Trash2, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { UpgradeModal } from "@/components/UpgradeModal";
import { AniVoiceMic } from "@/components/AniVoiceMic";
import { useScopedSelectAll } from "@/hooks/useScopedSelectAll";
import { isSafeMode, SAFE_MODE_BANNER } from "@/lib/aniRuntime";

const SESSION_KEY = "ani_session_id_v1";
const COUNT_KEY = "ani_anon_turn_count_v1";
const FREE_LIMIT = 10;

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto?.randomUUID?.() ?? `s_${Date.now()}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

type Turn = { q: string; a: string };

// The exact red used in the "The Empire" title gradient — bright, visible.
const EMPIRE_RED = "hsl(0 90% 50%)";

async function getAniErrorMessage(error: unknown, fallback = "Ani could not answer. Try again.") {
  const maybeError = error as { message?: string; context?: { json?: () => Promise<any>; text?: () => Promise<string> } };
  try {
    const body = await maybeError.context?.json?.();
    if (body?.error) return String(body.error);
  } catch {
    try {
      const text = await maybeError.context?.text?.();
      if (text) return text.slice(0, 240);
    } catch {
      // fall through to the normal error message
    }
  }
  return maybeError.message ?? fallback;
}

export const AniChat = () => {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQ, setCurrentQ] = useState("");
  const [currentA, setCurrentA] = useState("");
  const [authed, setAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [anonCount, setAnonCount] = useState(0);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const responseRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  useScopedSelectAll(shellRef, responseRef);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(COUNT_KEY) ?? "0", 10);
    setAnonCount(Number.isFinite(stored) ? stored : 0);

    const checkAuth = async (session: any) => {
      setAuthed(!!session);
      if (session?.user) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
        setIsAdmin(!!data?.some((r: any) => r.role === "admin"));
      } else {
        setIsAdmin(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => checkAuth(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => checkAuth(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [currentA, turns]);

  const remaining = Math.max(0, FREE_LIMIT - anonCount);
  // Owner / admin and signed-in users bypass the free cap (per memory rule #5).
  const gated = !authed && anonCount >= FREE_LIMIT;

  const safeMode = isSafeMode();

  const ask = async () => {
    const text = prompt.trim();
    if (!text) return;
    if (safeMode) {
      toast({ title: SAFE_MODE_BANNER.title, description: "Static deploy — see banner above for required env vars.", variant: "destructive" });
      return;
    }
    if (gated) { setShowUpgrade(true); return; }
    setLoading(true);
    setCurrentQ(text);
    setCurrentA("");
    setPrompt("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/unicorn-ask`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ prompt: text, skill: "ani", session_id: getSessionId(), stream: true }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!res.ok || !ct.includes("text/event-stream")) {
        // Fallback: parse JSON (paywall, error, or non-stream success)
        const data = await res.json().catch(() => ({}));
        if (data?.paywall) { setShowUpgrade(true); return; }
        if (data?.error) { toast({ title: "Ani is busy", description: data.error, variant: "destructive" }); return; }
        const answer = data?.response ?? "";
        setCurrentA(answer);
        setTurns((t) => [...t, { q: text, a: answer }]);
      } else {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const j = JSON.parse(payload);
              const delta = j?.choices?.[0]?.delta?.content ?? "";
              if (delta) { acc += delta; setCurrentA(acc); }
            } catch { /* ignore non-JSON event lines */ }
          }
        }
        setTurns((t) => [...t, { q: text, a: acc }]);
      }

      if (!authed) {
        const next = anonCount + 1;
        setAnonCount(next);
        localStorage.setItem(COUNT_KEY, String(next));
      }
    } catch (e) {
      toast({
        title: "Ani unreachable",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enter inserts a newline (for paragraphs). Submit is the round arrow button only.
  // Cmd/Ctrl + Enter also submits, for power users.
  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      ask();
    }
  };

  const clear = () => {
    setTurns([]);
    setCurrentQ("");
    setCurrentA("");
  };

  const displayQs = turns.map((t) => t.q);
  const displayAs = turns.map((t) => t.a);

  return (
    <>
    <div
      ref={shellRef}
      className="relative w-full rounded-3xl overflow-hidden flex flex-col"
      style={{
        background:
          "linear-gradient(145deg, #0a0a0a 0%, #1a0606 50%, #0a0a0a 100%)",
        border: "1px solid hsl(0 70% 25% / 0.6)",
        boxShadow:
          "0 30px 80px -20px hsl(0 90% 30% / 0.5), inset 0 1px 0 hsl(0 0% 100% / 0.06), inset 0 -40px 80px hsl(0 90% 15% / 0.3)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl"
        style={{
          boxShadow:
            "inset 0 0 60px hsl(0 90% 25% / 0.3), inset 0 0 1px hsl(0 0% 100% / 0.1)",
        }}
      />

      {safeMode && (
        <div className="relative m-3 md:m-4 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs md:text-sm text-amber-100">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-semibold">{SAFE_MODE_BANNER.title}</div>
              <div className="mt-1 opacity-90">{SAFE_MODE_BANNER.body}</div>
              <div className="mt-2 font-mono">required: {SAFE_MODE_BANNER.required.join(", ")}</div>
              <div className="font-mono opacity-70">optional: {SAFE_MODE_BANNER.optional.join(", ")}</div>
            </div>
          </div>
        </div>
      )}
      <div className="relative grid grid-cols-1 md:grid-cols-2 flex-1 min-h-[55vh]">
        {/* LEFT — your questions */}
        <div className="flex flex-col p-4 md:p-6 border-b md:border-b-0 md:border-r border-red-950/60">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-3">You</div>
          <div className="flex-1 overflow-y-auto space-y-3 text-white/90 text-sm md:text-base leading-relaxed pr-1">
            {displayQs.map((q, i) => (
              <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
                {q}
              </div>
            ))}
            {currentQ && !displayQs.includes(currentQ) && (
              <div className="rounded-lg bg-white/[0.05] border border-white/10 px-3 py-2">
                {currentQ}
              </div>
            )}
            {!displayQs.length && !currentQ && (
              <div className="text-white/30 italic text-sm">Ask Ani anything…</div>
            )}
          </div>
        </div>

        {/* RIGHT — Ani's response */}
        <div className="flex flex-col p-4 md:p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] uppercase tracking-[0.3em]" style={{ color: EMPIRE_RED }}>Ani</div>
            <div className="flex items-center gap-3">
              {!authed && !isAdmin && (
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  {remaining} free {remaining === 1 ? "turn" : "turns"} left
                </span>
              )}
              {(turns.length > 0 || currentA) && (
                <button
                  onClick={clear}
                  className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/80"
                >
                  <Trash2 className="h-3 w-3" /> clear
                </button>
              )}
            </div>
          </div>
          <div ref={responseRef} className="flex-1 overflow-y-auto pr-1 space-y-4">
            {displayAs.map((a, i) => (
              <div
                key={i}
                className="prose prose-invert prose-sm max-w-none text-white/85 prose-p:my-2 prose-headings:text-white prose-strong:text-white prose-a:text-red-300"
              >
                <ReactMarkdown>{a}</ReactMarkdown>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Ani is thinking…</span>
              </div>
            )}
            {!loading && currentA && !displayAs.includes(currentA) && (
              <div className="prose prose-invert prose-sm max-w-none text-white/85">
                <ReactMarkdown>{currentA}</ReactMarkdown>
              </div>
            )}
            {!loading && !displayAs.length && !currentA && (
              <div className="text-white/30 italic text-sm">Awaiting your move.</div>
            )}
          </div>
        </div>
      </div>

      {/* composer — bright Empire-red border + glow so it's unmistakable */}
      <div className="relative border-t border-red-950/60 bg-black/40 backdrop-blur p-3 md:p-4 flex items-end gap-3">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          maxLength={4000}
          placeholder="Speak to Ani… (Enter = new line · Cmd/Ctrl+Enter or arrow = send)"
          className="flex-1 resize-none rounded-xl bg-black/70 text-white placeholder:text-white/50 px-4 py-3 text-sm md:text-base focus:outline-none transition"
          style={{
            border: `1.5px solid ${EMPIRE_RED}`,
            boxShadow: `0 0 18px hsl(0 90% 45% / 0.45), inset 0 0 8px hsl(0 90% 30% / 0.25)`,
          }}
        />
        <AniVoiceMic />
        <button
          onClick={ask}
          disabled={loading || !prompt.trim()}
          aria-label="Send to Ani"
          className="shrink-0 inline-flex items-center justify-center h-12 w-12 md:h-14 md:w-14 rounded-full text-white disabled:opacity-40 transition-transform hover:scale-105 active:scale-95"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, hsl(0 95% 60%), hsl(0 90% 45%) 70%, hsl(0 90% 25%))",
            boxShadow:
              "0 0 30px hsl(0 90% 50% / 0.8), inset 0 1px 0 hsl(0 0% 100% / 0.25)",
          }}
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-6 w-6" strokeWidth={2.8} />}
        </button>
      </div>
    </div>
    <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} cap={FREE_LIMIT} />
    </>
  );
};
