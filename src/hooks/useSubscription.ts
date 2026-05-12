import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useAuth } from "./useAuth";

type Sub = {
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  paddle_customer_id: string;
  paddle_subscription_id: string;
};

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);

  const env = getPaddleEnvironment();

  const fetchSub = async (uid: string) => {
    const { data } = await supabase
      .from("subscriptions")
      .select("status,product_id,price_id,current_period_end,cancel_at_period_end,paddle_customer_id,paddle_subscription_id")
      .eq("user_id", uid)
      .eq("environment", env)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as Sub) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) { setSubscription(null); setLoading(false); return; }
    fetchSub(user.id);
    const channel = supabase
      .channel(`subs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${user.id}` },
        () => fetchSub(user.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isActive = !!subscription && (
    (["active", "trialing", "past_due"].includes(subscription.status) &&
      (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date())) ||
    (subscription.status === "canceled" && subscription.current_period_end &&
      new Date(subscription.current_period_end) > new Date())
  );

  return { subscription, loading, isActive, tier: subscription?.product_id ?? "free" };
}
