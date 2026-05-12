import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logo from "@/assets/unicorn-empire-logo-clear.png";

/**
 * PYRON pre-order confirmation. Gated: must be signed in.
 * Anonymous visitors are bounced to /auth and returned here after login.
 */
export default function PyronReserved() {
  const nav = useNavigate();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        nav(`/auth?next=${encodeURIComponent("/p/pyron/reserved")}`, { replace: true });
        return;
      }
      setEmail(data.session.user.email ?? null);
      setChecking(false);
    });
  }, [nav]);

  if (checking) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground"><Lock className="h-5 w-5 animate-pulse" /></div>;
  }

  return (
    <main className="min-h-screen bg-background text-foreground px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="flex items-center gap-2 mb-6">
          <img src={logo} alt="Unicorn Empire" className="h-8 w-8 object-contain" />
          <span className="text-xs uppercase tracking-[0.25em] text-white">Unicorn Empire</span>
        </Link>

        <Card className="p-6 border-primary/40">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-7 w-7 text-primary mt-0.5 shrink-0" />
            <div>
              <h1 className="text-2xl font-black text-white">PYRON™ reservation confirmed.</h1>
              <p className="text-sm text-muted-foreground mt-1">
                You're on the Step 4 build list{email ? ` as ${email}` : ""}. No charge today.
                When PYRON unlocks for production, you'll get a private link before public launch.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Next step</p>
              <p className="text-sm text-white mt-1">
                Watch Step 4 progress on the Empire Progress bar. Each pre-order moves the unlock meter.
              </p>
            </div>
            <Link to="/p/pyron"><Button variant="outline" className="w-full justify-between">View PYRON page <ArrowRight className="h-4 w-4" /></Button></Link>
            <Link to="/"><Button variant="outline" className="w-full justify-between">Back to the empire <ArrowRight className="h-4 w-4" /></Button></Link>
          </div>
        </Card>

        <p className="text-[10px] text-muted-foreground text-center mt-6">
          Reservation held for David Noyes / PGVA Ventures LLC. © Unicorn Empire.
        </p>
      </div>
    </main>
  );
}
