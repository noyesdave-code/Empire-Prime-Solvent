import { supabase } from "@/integrations/supabase/client";

/**
 * Standard intents accepted by the site-edit guard.
 * Add new ones here so every endpoint stays consistent.
 */
export type SiteEditIntent =
  | "brand.create"
  | "brand.update"
  | "brand.delete"
  | "boardroom.page.update"
  | "boardroom.asset.upload"
  | "boardroom.asset.delete"
  | "denylist.add"
  | "denylist.remove"
  | "site.config.update"
  | "other";

export interface GuardRequest {
  intent: SiteEditIntent;
  endpoint: string; // e.g. "brand-registry-admin", path of caller
  metadata?: Record<string, unknown>;
}

export interface GuardResponse {
  allowed: boolean;
  reason?: string;
  user_id?: string;
  email?: string;
}

/**
 * Typed client helper. ALL site-edit code paths must call this before
 * performing any write. It calls the `site-edit-guard` edge function
 * which authenticates the caller, checks the IP denylist, verifies
 * the admin/owner role, and records an audit row.
 */
export async function callSiteEditGuard(
  req: GuardRequest,
): Promise<GuardResponse> {
  const { data, error } = await supabase.functions.invoke<GuardResponse>(
    "site-edit-guard",
    {
      body: {
        intent: req.intent,
        endpoint: req.endpoint,
        metadata: req.metadata ?? {},
      },
    },
  );
  if (error) {
    return { allowed: false, reason: error.message };
  }
  return data ?? { allowed: false, reason: "no_response" };
}

/**
 * Convenience wrapper: throws if the guard denies the request.
 */
export async function requireSiteEditor(req: GuardRequest): Promise<GuardResponse> {
  const res = await callSiteEditGuard(req);
  if (!res.allowed) {
    throw new Error(`Site-edit denied: ${res.reason ?? "unauthorized"}`);
  }
  return res;
}
