// Per-user GitHub OAuth: returns the GitHub authorize URL with a signed state
// containing the requesting user's id and a return_to path.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SCOPES = "repo workflow";

function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signState(payload: object, secret: string): Promise<string> {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${b64url(sig)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });
  try {
    const clientId = Deno.env.get("GITHUB_OAUTH_CLIENT_ID");
    if (!clientId) throw new Error("GITHUB_OAUTH_CLIENT_ID not configured");
    const stateSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) return new Response(JSON.stringify({ error: "missing auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data, error } = await userClient.auth.getUser();
    if (error || !data?.user) return new Response(JSON.stringify({ error: "not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { return_to } = await req.json().catch(() => ({}));
    const returnTo = typeof return_to === "string" && return_to.startsWith("http") ? return_to : "https://unicornaibuilder.lovable.app/ide";

    const state = await signState({ u: data.user.id, r: returnTo, n: crypto.randomUUID(), e: Date.now() + 600_000 }, stateSecret);
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ide-github-oauth-callback`;
    const authorizeUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}&state=${encodeURIComponent(state)}&allow_signup=true`;

    return new Response(JSON.stringify({ url: authorizeUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
