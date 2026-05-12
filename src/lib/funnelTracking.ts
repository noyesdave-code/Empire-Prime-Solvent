// Shared funnel tracking + checkout state.
// One source of truth for: session id, UTM/referrer attribution, event logging,
// and persisted checkout draft (email + tier + product) across refresh / back nav.
import { supabase } from "@/integrations/supabase/client";

export type CtaVariant = "A" | "B";

export type FunnelEventType =
  | "impression"
  | "click_checkout"
  | "click_blueprint"
  | "lead"
  | "blueprint_sent"
  | "email_entered"
  | "checkout_opened"
  | "checkout_paid";

const SESSION_KEY = "funnel_session_id";
const ATTRIB_KEY = "funnel_attribution_v1";
const DRAFT_KEY = "unicorn_checkout_draft_v1";
// Mirror of the legacy intake key so post-Paddle Blueprint page survives any
// session-storage clear (e.g. Safari ITP, mobile Paddle popup).
const INTAKE_KEY = "unicorn_blueprint_intake";

export function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let s = window.localStorage.getItem(SESSION_KEY);
    if (!s) {
      s = (crypto?.randomUUID?.() ?? `s_${Date.now()}_${Math.random().toString(36).slice(2)}`).slice(0, 64);
      window.localStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

export type Attribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_path?: string;
  first_seen_at?: string;
};

/** Capture UTM/referrer from the current URL on first hit, persist forever, and return. */
export function getAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const stored = window.localStorage.getItem(ATTRIB_KEY);
    if (stored) return JSON.parse(stored) as Attribution;

    const url = new URL(window.location.href);
    const pick = (k: string) => url.searchParams.get(k)?.slice(0, 128) || undefined;
    const attribution: Attribution = {
      utm_source: pick("utm_source"),
      utm_medium: pick("utm_medium"),
      utm_campaign: pick("utm_campaign"),
      utm_content: pick("utm_content"),
      utm_term: pick("utm_term"),
      referrer: document.referrer ? document.referrer.slice(0, 512) : undefined,
      landing_path: window.location.pathname.slice(0, 256),
      first_seen_at: new Date().toISOString(),
    };
    window.localStorage.setItem(ATTRIB_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return {};
  }
}

export async function trackFunnelEvent(args: {
  event_type: FunnelEventType;
  stage?: string;
  product?: string;
  variant?: CtaVariant;
  tier?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const attribution = getAttribution();
    await supabase.from("funnel_events").insert({
      event_type: args.event_type,
      stage: args.stage ?? null,
      product: args.product ?? null,
      ab_cta_variant: args.variant ?? null,
      session_id: getSessionId(),
      metadata: {
        ...(args.tier ? { tier: args.tier } : {}),
        ...(args.metadata ?? {}),
        attribution,
      },
    });
  } catch {
    /* analytics best-effort */
  }
}

// ---------- Checkout draft persistence (survives refresh + back nav) ----------

export type CheckoutDraft = {
  email?: string;
  tier?: string;
  product_id?: string;
  updated_at: string;
};

export function saveCheckoutDraft(patch: Partial<CheckoutDraft>): CheckoutDraft {
  const current = loadCheckoutDraft();
  const next: CheckoutDraft = { ...current, ...patch, updated_at: new Date().toISOString() };
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function loadCheckoutDraft(): CheckoutDraft {
  if (typeof window === "undefined") return { updated_at: "" };
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return { updated_at: "" };
    return JSON.parse(raw) as CheckoutDraft;
  } catch {
    return { updated_at: "" };
  }
}

export function clearCheckoutDraft() {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Mirror the intake payload to localStorage so the Blueprint page can recover it
 *  even if sessionStorage was wiped during the Paddle redirect. */
export function persistIntake(payload: unknown) {
  try {
    const json = JSON.stringify(payload);
    window.sessionStorage.setItem(INTAKE_KEY, json);
    window.localStorage.setItem(INTAKE_KEY, json);
  } catch {
    /* ignore */
  }
}

export function recoverIntake(): string | null {
  try {
    return window.sessionStorage.getItem(INTAKE_KEY) || window.localStorage.getItem(INTAKE_KEY);
  } catch {
    return null;
  }
}

export function clearIntake() {
  try {
    window.sessionStorage.removeItem(INTAKE_KEY);
    window.localStorage.removeItem(INTAKE_KEY);
  } catch {
    /* ignore */
  }
}
