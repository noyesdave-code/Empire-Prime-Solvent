import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface Props {
  priceId: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
}

export function SubscribeButton({ priceId, label = "Subscribe", className, variant = "default" }: Props) {
  const { user } = useAuth();
  const { openCheckout, loading } = usePaddleCheckout();
  const navigate = useNavigate();

  const handle = async () => {
    if (!user) {
      navigate(`/auth?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      await openCheckout({
        priceId,
        customerEmail: user.email!,
        userId: user.id,
      });
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    }
  };

  return (
    <Button
      onClick={handle}
      disabled={loading}
      variant={variant}
      aria-busy={loading}
      aria-label={loading ? `${label} loading` : label}
      className={cn("relative", className)}
    >
      {/* Invisible label keeps button width stable while loading */}
      <span className={cn("inline-flex items-center", loading && "invisible")}>{label}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
        </span>
      )}
    </Button>
  );
}
