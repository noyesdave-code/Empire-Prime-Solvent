// Visitor-facing "Drop pennies in Ani's jar" button.
// Opens Paddle overlay with the ani_penny_tip price + quantity = whole dollars.
// Real payments go to penny_jar_ledger via payments-webhook.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Coins, Loader2 } from "lucide-react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { toast } from "@/components/ui/sonner";

const AMOUNTS = [1, 5, 10, 25];

export function PennyTipButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState<number | "">("");

  const tip = async (dollars: number) => {
    if (!dollars || dollars < 1) return;
    setLoading(true);
    try {
      await initializePaddle();
      const priceId = await getPaddlePriceId("ani_penny_tip");
      // @ts-ignore — Paddle is loaded globally
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: Math.min(10000, Math.max(1, Math.floor(dollars))) }],
        customData: { intent: "ani_penny_tip" },
        settings: { displayMode: "overlay", variant: "one-page", allowLogout: false },
      });
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't open the jar — try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-2">
      <Button
        size={compact ? "sm" : "default"}
        variant="outline"
        onClick={() => setOpen((o) => !o)}
        className="border-primary/40"
      >
        <Coins className="h-4 w-4 mr-1 text-primary" />
        Drop pennies in Ani's jar
      </Button>
      {open && (
        <div className="rounded border bg-background p-3 shadow-md space-y-2">
          <div className="text-xs text-muted-foreground">
            Pay-what-you-want · $1 minimum (card processors won't accept 1¢ directly — every dollar still drops as 100 pennies in the jar).
          </div>
          <div className="flex flex-wrap gap-1">
            {AMOUNTS.map((a) => (
              <Button key={a} size="sm" variant="secondary" disabled={loading} onClick={() => tip(a)}>
                ${a}
              </Button>
            ))}
            <input
              type="number"
              min={1}
              max={10000}
              placeholder="Custom $"
              value={custom}
              onChange={(e) => setCustom(e.target.value ? Number(e.target.value) : "")}
              className="w-20 px-2 text-sm border rounded"
            />
            <Button size="sm" disabled={loading || !custom} onClick={() => typeof custom === "number" && tip(custom)}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Drop"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
