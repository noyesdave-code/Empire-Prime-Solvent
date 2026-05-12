import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Loader2, Download, ArrowLeft, ShieldCheck, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/unicorn-empire-logo.png";
import { FLEET_PRODUCTS } from "@/lib/fleetProducts";
import {
  trackFunnelEvent,
  recoverIntake,
  clearIntake,
  clearCheckoutDraft,
} from "@/lib/funnelTracking";

export default function UnicornBoxBlueprint() {
  const [searchParams] = useSearchParams();
  const paid = searchParams.get("paid") === "1";
  const productId = searchParams.get("product") || undefined;
  const tierFromUrl = searchParams.get("tier") || undefined;

  const [loading, setLoading] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<string>(tierFromUrl ?? "");
  const [emailFromIntake, setEmailFromIntake] = useState<string>("");
  const [intakePayload, setIntakePayload] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const product = useMemo(() => FLEET_PRODUCTS.find((p) => p.id === productId), [productId]);

  useEffect(() => {
    if (paid) {
      trackFunnelEvent({
        event_type: "checkout_paid",
        stage: "blueprint_success",
        product: productId,
        tier: tierFromUrl,
      });
      // Customer paid — they no longer need the abandoned-cart draft.
      clearCheckoutDraft();
    }
  }, [paid, productId, tierFromUrl]);

  useEffect(() => {
    const raw = recoverIntake();
    if (!raw) {
      setError(
        "We couldn't find your intake. If you just paid, your receipt has a link to start a new Blueprint, or contact support@unicornaibuilder.com with your order ID.",
      );
      setLoading(false);
      return;
    }
    let parsed: { tier: string; intake: Record<string, unknown>; email: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      setError("Intake data corrupted.");
      setLoading(false);
      return;
    }
    setTier(parsed.tier || tierFromUrl || "");
    setEmailFromIntake(parsed.email || "");
    setIntakePayload(raw);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("blueprint-generate", { body: parsed });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setOutput(data.output);
        // Keep intake mirrored for "Resend Blueprint" — only clear the session copy.
        try { window.sessionStorage.removeItem("unicorn_blueprint_intake"); } catch { /* ignore */ }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Generation failed.";
        setError(msg);
        toast({ title: "Blueprint error", description: msg, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resendBlueprint = async () => {
    if (!intakePayload) return;
    setResending(true);
    try {
      const parsed = JSON.parse(intakePayload);
      const { data, error } = await supabase.functions.invoke("blueprint-generate", { body: parsed });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setOutput(data.output);
      toast({
        title: "Blueprint regenerated",
        description: `A fresh copy is ready. Receipt + backup go to ${parsed.email}.`,
      });
    } catch (e) {
      toast({
        title: "Resend failed",
        description: e instanceof Error ? e.message : "Try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const downloadMd = () => {
    if (!output) return;
    const blob = new Blob([output], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `unicorn-blueprint-${tier || "v1"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="caribbean-accent min-h-screen bg-background text-foreground">
      <title>Your Unicorn Blueprint</title>
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-hero)" }} />

      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
            <span className="text-sm font-semibold">Unicorn Box™ · Blueprint</span>
          </Link>
          {output && (
            <Button onClick={downloadMd} size="sm" variant="outline">
              <Download className="h-3.5 w-3.5 mr-1" /> Download .md
            </Button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/unicorn-box" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-3 w-3" /> Start another Blueprint
        </Link>

        {paid && (
          <div className="mb-6 rounded-2xl border-2 border-fluoro-gold bg-fluoro-gold/10 p-5 shadow-[0_0_24px_hsl(var(--primary)/0.25)]">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-7 w-7 text-fluoro-gold shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <h2 className="text-xl font-black text-fluoro-gold">Payment confirmed — you're in.</h2>
                <p className="text-sm">
                  {product ? <><span className="font-bold text-foreground">{product.display}</span> · </> : null}
                  Tier <span className="font-bold uppercase tracking-wider text-fluoro-gold">{tier || tierFromUrl || "—"}</span>
                </p>
                {emailFromIntake && (
                  <div className="rounded-lg border border-fluoro-gold/40 bg-background/40 p-3 text-xs flex items-center gap-2 flex-wrap">
                    <Mail className="h-4 w-4 text-fluoro-gold" />
                    <span className="text-muted-foreground">Receipt &amp; Blueprint sent to</span>
                    <span className="font-mono font-bold text-foreground">{emailFromIntake}</span>
                  </div>
                )}
                <div className="flex gap-2 flex-wrap pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={resendBlueprint}
                    disabled={resending || !intakePayload}
                    className="border-fluoro-gold text-fluoro-gold hover:bg-fluoro-gold/10"
                  >
                    {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                    {resending ? "Resending…" : "Resend Blueprint email"}
                  </Button>
                  <a
                    href={`mailto:support@unicornaibuilder.com?subject=${encodeURIComponent(
                      `Receipt help — ${product?.display ?? "Unicorn Box"} (${tier || tierFromUrl || "?"})`,
                    )}`}
                    className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground underline px-2"
                  >
                    Need a copy of the receipt?
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="glass-strong rounded-2xl p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Generating your Blueprint…</h1>
            <p className="text-muted-foreground text-sm">This takes 30–90 seconds. Don't close the tab.</p>
            <p className="mt-4 text-[11px] uppercase tracking-widest text-fluoro-gold inline-flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" /> Saved to your account · Email backup on the way
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="glass-strong rounded-2xl p-8">
            <h1 className="text-xl font-bold mb-2 text-destructive">Something went wrong</h1>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 flex-wrap">
              <Button asChild><Link to="/unicorn-box/start">Try again</Link></Button>
              {product && (
                <Button asChild variant="outline">
                  <Link to={`/p/${product.id}`}>Back to {product.display}</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        {output && !loading && (
          <article className="glass-strong rounded-2xl p-6 md:p-10 prose prose-invert max-w-none
                              prose-headings:text-foreground prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3
                              prose-strong:text-foreground prose-a:text-primary
                              prose-ul:list-disc prose-ol:list-decimal">
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">{output}</pre>
          </article>
        )}
      </section>
    </main>
  );
}
