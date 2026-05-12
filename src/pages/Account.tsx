import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useNoIndex } from "@/hooks/useNoIndex";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RenewalAgentButton } from "@/components/RenewalAgentButton";

export default function Account() {
  useNoIndex();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) navigate("/auth?next=/account");
  }, [loading, user, navigate]);

  if (loading || !user) return null;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Your account</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <Card className="p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Subscription</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Thinking about cancelling, downgrading, or upgrading? Talk it
            through with a renewal specialist before you decide — voice call,
            no wait.
          </p>
        </div>
        <RenewalAgentButton />
      </Card>

      <Card className="p-5 space-y-2">
        <h2 className="text-lg font-semibold">Help</h2>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/refund">Refund policy</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/terms">Terms</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/privacy">Privacy</Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
