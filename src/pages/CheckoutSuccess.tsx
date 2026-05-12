import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";

export default function CheckoutSuccess() {
  return (
    <main className="min-h-screen bg-background text-foreground grid-bg flex items-center justify-center px-4">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-hero)" }} />
      <div className="relative z-10 max-w-lg text-center glass-strong rounded-3xl p-10">
        <Sparkles className="mx-auto h-12 w-12 text-accent mb-4 animate-pulse" />
        <h1 className="text-3xl font-bold text-gradient-empire mb-3">You're in.</h1>
        <p className="text-muted-foreground mb-6">
          Your subscription is being activated. The Unicorn brain is now syncing your account — you'll see new features unlock within a minute.
        </p>
        <Button asChild className="w-full">
          <Link to="/">Enter the Empire <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
      </div>
    </main>
  );
}
