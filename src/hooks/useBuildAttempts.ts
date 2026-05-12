// Tracks Empire IDE build/deploy usage per signed-in user.
// Owner/admin and subscribers are unlimited (server enforces).
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPaddleEnvironment } from "@/lib/paddle";

export type BuildAttemptStatus = {
  allowed: boolean;
  used: number;
  limit: number;
  requiresPayment: boolean;
  reason: string | null;
};

const DEFAULT: BuildAttemptStatus = {
  allowed: true, used: 0, limit: 10, requiresPayment: false, reason: null,
};

export function useBuildAttempts() {
  const { user } = useAuth();
  const [status, setStatus] = useState<BuildAttemptStatus>(DEFAULT);
  const [loading, setLoading] = useState(false);

  const env = getPaddleEnvironment();

  const refresh = useCallback(async () => {
    if (!user) {
      setStatus({ ...DEFAULT, allowed: false, requiresPayment: true, reason: "sign in to start building" });
      return;
    }
    try {
      const { data } = await supabase.functions.invoke("ide-build-attempt", {
        body: { dry_run: true, environment: env },
      });
      if (data?.ok) {
        setStatus({
          allowed: !!data.allowed,
          used: Number(data.used ?? 0),
          limit: Number(data.limit ?? 10),
          requiresPayment: !!data.requires_payment,
          reason: data.reason ?? null,
        });
      }
    } catch {
      /* network noise — keep last known status */
    }
  }, [user, env]);

  useEffect(() => { refresh(); }, [refresh]);

  /** Consume one attempt. Returns true if the caller may proceed; false means show paywall. */
  const consume = useCallback(async (): Promise<BuildAttemptStatus> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ide-build-attempt", {
        body: { environment: env },
      });
      if (error || !data?.ok) {
        const next: BuildAttemptStatus = {
          allowed: false, used: status.used, limit: status.limit,
          requiresPayment: true, reason: data?.error ?? error?.message ?? "could not check usage",
        };
        setStatus(next);
        return next;
      }
      const next: BuildAttemptStatus = {
        allowed: !!data.allowed,
        used: Number(data.used ?? 0),
        limit: Number(data.limit ?? 10),
        requiresPayment: !!data.requires_payment,
        reason: data.reason ?? null,
      };
      setStatus(next);
      return next;
    } finally {
      setLoading(false);
    }
  }, [env, status.used, status.limit]);

  return { status, loading, refresh, consume };
}
