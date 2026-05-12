// Paywall shown inside the Empire IDE after the 10 free build attempts are used.
// Uses the white / ash / red / black palette only (per memory rule #10).
import { Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  used: number;
  limit: number;
  onClose: () => void;
}

export function BuildPaywall({ open, used, limit, onClose }: Props) {
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();

  if (!open) return null;

  const buy = async () => {
    if (!user) {
      window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    try {
      await openCheckout({
        priceId: "empire_builder_monthly",
        customerEmail: user.email,
        userId: user.id,
        successUrl: `${window.location.origin}/checkout/success?return=${encodeURIComponent(window.location.pathname)}`,
      });
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 backdrop-blur p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-red-700/60 bg-zinc-950 text-white shadow-[0_0_60px_hsl(0_90%_30%/0.5)]">
        <button onClick={onClose} aria-label="Close" className="absolute right-3 top-3 text-zinc-400 hover:text-white">
          <X size={18} />
        </button>
        <div className="p-6">
          <div className="text-[10px] uppercase tracking-[0.3em] text-red-500">Empire Builder</div>
          <h2 className="text-2xl font-black mt-1">You've used your {limit} free builds.</h2>
          <p className="text-sm text-zinc-400 mt-2">
            You've burned <span className="text-white font-bold">{used}</span> of {limit} free attempts. Upgrade to keep building, running, and deploying without limits.
          </p>

          <div className="mt-5 rounded-xl border border-zinc-800 bg-black p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">$27</span>
              <span className="text-xs text-zinc-500">/ month</span>
            </div>
            <ul className="mt-3 space-y-1.5 text-xs text-zinc-300">
              <li>• Unlimited Run + Ani Build attempts</li>
              <li>• Unlimited deploys to GitHub Pages &amp; Vercel</li>
              <li>• Cancel anytime · secure checkout by Paddle</li>
            </ul>
          </div>

          <button
            onClick={buy}
            disabled={loading}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-3 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Upgrade — keep building
          </button>
          <button onClick={onClose} className="mt-2 w-full text-xs text-zinc-500 hover:text-zinc-300 py-1">
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
