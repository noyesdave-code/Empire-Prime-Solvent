import { useEffect, useState } from "react";
import { Loader2, Sparkles, X, Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { toast } from "@/components/ui/sonner";

// Renamed for the Empire palette — same prices & priceIds.
// Palette: white / ash / red / black. No greens or yellows.
// priceId values MUST match Paddle external_ids exactly (verified live + sandbox).
export const UPGRADE_TIERS = [
  { name: "Ember",    price: "$5",   priceId: "sparks_monthly",   blurb: "Unlimited Ani access" },
  { name: "Ash",      price: "$7",   priceId: "pony_monthly",     blurb: "+ priority brain routing" },
  { name: "Obsidian", price: "$19",  priceId: "stallion_monthly", blurb: "+ deep research mode" },
  { name: "Crimson",  price: "$27",  priceId: "founder_monthly",  blurb: "+ founder playbooks", popular: true },
  { name: "Ivory",    price: "$147", priceId: "pro_monthly",      blurb: "+ swarms & sourcing" },
  { name: "Empire",   price: "$497", priceId: "agency_monthly",   blurb: "+ multi-brand seats" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  /** Optional: how many free questions the user just used (for headline copy). */
  cap?: number;
}

export function UpgradeModal({ open, onClose, cap = 10 }: Props) {
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();
  const navigate = useNavigate();
  const [activeTier, setActiveTier] = useState<string | null>(null);

  // Lock scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handlePick = async (priceId: string) => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setActiveTier(priceId);
    try {
      await openCheckout({
        priceId,
        customerEmail: user.email!,
        userId: user.id,
        // Resume right where they left off — query param lets the host page show a "you're back, keep asking" toast.
        successUrl: `${window.location.origin}${window.location.pathname}?upgraded=1`,
      });
    } catch (e: any) {
      toast.error(e?.message || "Checkout failed — try again.");
    } finally {
      setActiveTier(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-background/85 backdrop-blur-sm px-4 py-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Upgrade to keep asking Unicorn"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl p-[2px] shadow-[0_0_60px_hsl(0_90%_40%/0.55)]"
        style={{ background: "linear-gradient(135deg, #ffffff 0%, hsl(0 0% 70%) 30%, hsl(0 90% 50%) 65%, #000000 100%)" }}
      >
        <div className="relative rounded-3xl p-5 sm:p-7" style={{ background: "linear-gradient(160deg, #0a0a0a 0%, #1a0606 60%, #050505 100%)" }}>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5" style={{ color: "hsl(0 90% 55%)" }} />
            <p className="text-[10px] uppercase tracking-[0.25em] font-bold" style={{ color: "hsl(0 0% 70%)" }}>
              You hit your {cap} free turns with Ani
            </p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Keep building — unlock{" "}
            <span style={{
              background: "linear-gradient(180deg, #ffffff 0%, hsl(0 0% 75%) 40%, hsl(0 90% 50%) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>unlimited Ani</span>
          </h2>
          <p className="mt-2 text-sm text-white/75">
            Pick a tier. One-tap checkout. You resume right here the second it clears.
          </p>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {UPGRADE_TIERS.map((t) => {
              const isLoading = loading && activeTier === t.priceId;
              return (
                <button
                  key={t.priceId}
                  onClick={() => handlePick(t.priceId)}
                  disabled={loading}
                  className="relative text-left rounded-xl p-3 transition-all hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
                  style={{
                    background: "linear-gradient(160deg, #0a0a0a 0%, #1a0606 100%)",
                    border: t.popular ? "2px solid hsl(0 90% 55%)" : "1.5px solid hsl(0 0% 35%)",
                    boxShadow: t.popular ? "0 0 20px hsl(0 90% 45% / 0.55)" : "inset 0 0 0 1px hsl(0 0% 100% / 0.04)",
                  }}
                >
                  {t.popular && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                      style={{ background: "hsl(0 90% 45%)" }}>
                      Most picked
                    </span>
                  )}
                  <p className="text-xs font-bold text-white">{t.name}</p>
                  <p className="text-xl font-black text-white leading-none mt-0.5">
                    {t.price}<span className="text-[10px] text-white/60">/mo</span>
                  </p>
                  <p className="mt-1.5 flex items-start gap-1 text-[10px] text-white/75 leading-tight">
                    <Check className="h-3 w-3 mt-px shrink-0" style={{ color: "hsl(0 90% 60%)" }} />
                    {t.blurb}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "hsl(0 90% 60%)" }}>
                    {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    {isLoading ? "Opening…" : "Subscribe & resume →"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/60">
            {user ? (
              <span>Signed in as <span className="text-white">{user.email}</span></span>
            ) : (
              <Link to={`/auth?next=${encodeURIComponent(window.location.pathname)}`} className="underline hover:text-white">
                Sign in first to link your subscription
              </Link>
            )}
            <button onClick={onClose} className="underline underline-offset-4 hover:text-white">
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
