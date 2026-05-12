import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, LogOut, LogIn, ArrowUp, RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logo from "@/assets/unicorn-empire-logo-clear.png";
import { SubscribeButton } from "@/components/SubscribeButton";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useScopedSelectAll } from "@/hooks/useScopedSelectAll";
import { useChatHistory } from "@/hooks/useChatHistory";
import { ChatMessageList } from "@/components/ChatMessageList";
import { useJsonLd } from "@/hooks/useJsonLd";

const VEIL_KEY = "unicorn_veil_dismissed_v1";
const SESSION_KEY = "unicorn_session_id_v1";
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

const TIERS: { name: string; price: string; priceId: string; popular?: boolean }[] = [
  { name: "Sparks",   price: "$5",   priceId: "sparks_monthly" },
  { name: "Pony",     price: "$7",   priceId: "pony_monthly" },
  { name: "Founder",  price: "$27",  priceId: "founder_monthly", popular: true },
  { name: "Stallion", price: "$19",  priceId: "stallion_monthly" },
  { name: "Pro",      price: "$147", priceId: "pro_monthly" },
  { name: "Agency",   price: "$497", priceId: "agency_monthly" },
];

const PROMPT_CHIPS = [
  "Name my brand",
  "Write my landing page",
  "Pick my niche",
  "Plan my launch week",
];

const UNLOCKS = [
  "Unlimited questions across all skills",
  "Premium models (GPT-5, Gemini 2.5 Pro)",
  "Save chats + Unicorn Box build credits",
];

export const LandingVeil = ({ forceOpen = false }: { forceOpen?: boolean }) => {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(FREE_LIMIT);
  const [paywall, setPaywall] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  useScopedSelectAll(shellRef, answerRef);
  const { user, signOut } = useAuth();
  const { messages, append, replaceLastAssistant, lastUserPrompt, clear, hasCheckpoint, restoreCheckpoint } = useChatHistory("veil");

  useJsonLd("veil-schema", [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Unicorn AI Builder",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "Free multi-brain AI router for founders. Ask anything — get specific, fluff-free answers from a routed swarm of frontier models.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "1200" },
      url: "https://unicornaibuilder.lovable.app",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "What is Unicorn AI Builder?", acceptedAnswer: { "@type": "Answer", text: "A free AI assistant that routes your question across multiple frontier models (Gemini, GPT-5) and returns the best answer for founders, builders, and operators." } },
        { "@type": "Question", name: "Is it really free?", acceptedAnswer: { "@type": "Answer", text: "Yes — every visitor gets 10 free questions, no signup required. Paid tiers unlock unlimited questions and premium skills." } },
        { "@type": "Question", name: "What can I ask?", acceptedAnswer: { "@type": "Answer", text: "Startup strategy, product naming, pricing, marketing copy, technical architecture, fundraising — anything a founder needs day to day." } },
      ],
    },
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (forceOpen || !sessionStorage.getItem(VEIL_KEY)) setOpen(true);
  }, [forceOpen]);

  // scroll handled inside ChatMessageList

  const dismiss = () => {
    sessionStorage.setItem(VEIL_KEY, "1");
    setOpen(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  };

  const ask = async (overridePrompt?: string, replaceLast = false) => {
    if (paywall) return;
    const text = (overridePrompt ?? prompt).trim();
    if (!text || text.length > 4000) {
      toast({ title: "Type a question first" });
      return;
    }
    setLoading(true);
    if (!replaceLast) append("user", text);
    try {
      const { data, error } = await supabase.functions.invoke("unicorn-ask", {
        body: { prompt: text, skill: "business-builder", session_id: getSessionId() },
      });
      if (error) throw error;
      if (data?.paywall) {
        setPaywall(true);
        setRemaining(0);
        setShowUpgrade(true);
        return;
      }
      if (data?.error) {
        toast({ title: "Brain busy", description: data.error, variant: "destructive" });
        return;
      }
      if (replaceLast) replaceLastAssistant(data.response);
      else append("assistant", data.response);
      if (!overridePrompt) setPrompt("");
      if (typeof data.remaining === "number") {
        setRemaining(data.remaining);
        if (data.remaining === 0) {
          setPaywall(true);
          setShowUpgrade(true);
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

  if (!open) return null;

  return (
    <div
      className="caribbean-accent fixed inset-0 z-[100] overflow-y-auto bg-background"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Unicorn Empire"
    >
      <div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center px-4 pt-3 pb-6 sm:px-6">
        {/* Logo — locked, no animation, no glow */}
        <img
          src={logo}
          alt="Unicorn Empire"
          className="h-14 w-14 sm:h-16 sm:w-16 object-contain select-none"
          draggable={false}
        />

        {/* Headline — tight */}
        <h1 className="mt-1 text-center text-xl sm:text-2xl font-black leading-tight" style={{ color: "hsl(0 0% 100%)" }}>
          What can <span style={{ color: "hsl(0 0% 100%)" }}>Unicorn</span> help you with?
        </h1>
        <p className="mt-1 text-center text-[10px] uppercase tracking-[0.2em]" style={{ color: "hsl(0 0% 100% / 0.8)" }}>
          Joined by 1,200+ founders · 10 free questions · no signup
        </p>

        {/* Lovable-style chat box: answer above, textarea below */}
        <div ref={shellRef} className="mt-2 w-full unicorn-chat-shell relative">
          {messages.length > 0 && (
            <div className="mb-2">
              <div className="mb-1 flex items-center justify-end gap-1">
                {hasCheckpoint && (
                  <button onClick={restoreCheckpoint} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] hover:bg-white/10" style={{ color: "hsl(0 0% 100%)" }} title="Restore last checkpoint">
                    <RotateCcw className="h-3 w-3" /> Restore
                  </button>
                )}
                <button onClick={clear} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] hover:bg-white/10" style={{ color: "hsl(0 0% 100%)" }} title="Clear chat">
                  <Trash2 className="h-3 w-3" /> Clear
                </button>
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
          {messages.length === 0 && !paywall && (
            <div className="mb-2 flex flex-wrap gap-1.5 justify-center">
              {PROMPT_CHIPS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => ask(c)}
                  className="rounded-full px-2.5 py-1 text-[10px] font-semibold border border-[hsl(185_100%_65%)] hover:bg-[hsl(185_100%_65%/0.18)]"
                  style={{ color: "hsl(0 0% 100%)" }}
                >
                  {c} →
                </button>
              ))}
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                ask();
              }
            }}
            placeholder="Ask Unicorn anything…"
            rows={2}
            className="unicorn-chat-input pr-12"
          />
          <button
            onClick={paywall ? () => setShowUpgrade(true) : () => ask()}
            disabled={loading}
            aria-label={paywall ? "Upgrade to keep asking" : "Send"}
            className="absolute bottom-12 right-5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-[hsl(185_100%_55%)] text-[hsl(195_90%_12%)] hover:brightness-110 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : paywall ? <Sparkles className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
          </button>
          <div className="mt-2 flex items-center justify-between gap-2">
            {paywall ? (
              <button onClick={() => setShowUpgrade(true)} className="text-[10px] font-bold underline underline-offset-2" style={{ color: "hsl(0 0% 100%)" }}>
                0 free questions left — pick a tier →
              </button>
            ) : (
              <span className="text-[10px] font-semibold" style={{ color: "hsl(0 0% 100%)" }}>
                {`${remaining} of ${FREE_LIMIT} free questions`}
              </span>
            )}
            <div className="flex items-center gap-3">
              <Link to="/unicorn-box" onClick={dismiss} className="text-[10px] font-bold underline-offset-4 hover:underline" style={{ color: "hsl(185 100% 75%)" }}>
                Build my Box →
              </Link>
              <button onClick={dismiss} className="text-[10px] font-semibold underline-offset-4 hover:underline" style={{ color: "hsl(0 0% 100%)" }}>
                Skip to site →
              </button>
            </div>
          </div>
        </div>

        {/* Account control — centered under chat box */}
        <div className="mt-3 flex justify-center">
          {user ? (
            <button
              onClick={async () => { await signOut(); toast({ title: "Signed out" }); }}
              className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-semibold text-fluoro-white border border-[hsl(185_100%_65%)] hover:bg-[hsl(185_100%_65%/0.15)]"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-full bg-background px-4 py-2 text-xs font-semibold text-fluoro-white border border-[hsl(185_100%_65%)] hover:bg-[hsl(185_100%_65%/0.15)]"
            >
              <LogIn className="h-3.5 w-3.5" /> Sign in for unlimited
            </Link>
          )}
        </div>

        {/* Tier pricing — directly under chat */}
        {paywall && (
          <>
            <p className="mt-3 text-[10px] uppercase tracking-[0.25em] text-center" style={{ color: "hsl(0 0% 100%)" }}>
              Subscribe to keep asking
            </p>
            <ul className="mt-1.5 mx-auto max-w-xs space-y-0.5 text-[10px]" style={{ color: "hsl(0 0% 100% / 0.9)" }}>
              {UNLOCKS.map((u) => (
                <li key={u} className="flex items-start gap-1.5">
                  <span style={{ color: "hsl(185 100% 70%)" }}>✓</span>
                  <span>{u}</span>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="mt-2 grid w-full grid-cols-3 gap-1.5">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="relative rounded-lg p-1.5 text-center bg-card flex flex-col"
              style={{
                border: t.popular ? "3px solid hsl(50 100% 60%)" : "3px solid hsl(185 100% 60%)",
                boxShadow: t.popular ? "0 0 0 1px hsl(50 100% 70%) inset, 0 0 12px hsl(50 100% 60% / 0.5)" : "0 0 0 1px hsl(185 100% 70%) inset",
              }}
            >
              {t.popular && (
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[8px] font-black uppercase tracking-wider whitespace-nowrap" style={{ background: "hsl(50 100% 60%)", color: "hsl(195 90% 12%)" }}>
                  Popular
                </span>
              )}
              <p className="text-[11px] font-bold" style={{ color: "hsl(0 0% 100%)" }}>{t.name}</p>
              <p className="text-sm font-black leading-none" style={{ color: "hsl(0 0% 100%)" }}>
                {t.price}<span className="text-[9px]" style={{ color: "hsl(0 0% 100% / 0.85)" }}>/mo</span>
              </p>
              <SubscribeButton priceId={t.priceId} label="Go" variant="outline" className="mt-1 h-6 w-full px-1 text-[10px] border-2 text-white" />
            </div>
          ))}
        </div>

        {/* Enter the full site */}
        <button
          onClick={dismiss}
          className="mt-5 inline-flex items-center justify-center rounded-full bg-[hsl(185_100%_55%)] px-6 py-2.5 text-sm font-bold text-[hsl(195_90%_12%)] hover:brightness-110 shadow-lg"
        >
          Enter Unicorn Empire site →
        </button>
        <p className="mt-1.5 text-[10px] text-center" style={{ color: "hsl(0 0% 100% / 0.75)" }}>
          See Unicorn Box™, Emerald, Marble & all products
        </p>
      </div>
      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} cap={FREE_LIMIT} />
    </div>
  );
};
