// GitHub OAuth callback: verifies signed state, exchanges code for token,
// stores token in private vault, then redirects user back to return_to.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = ""; for (const v of bytes) s += String.fromCharCode(v);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function verifyState(state: string, secret: string): Promise<{ u: string; r: string; e: number } | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, b64urlDecode(sig), new TextEncoder().encode(body));
  if (!ok) return null;
  try {
    const obj = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (typeof obj?.e !== "number" || obj.e < Date.now()) return null;
    return obj;
  } catch { return null; }
}

function htmlRedirect(url: string, message: string, login?: string): Response {
  const safe = url.replace(/"/g, "&quot;");
  const loginJson = JSON.stringify(login ?? null);
  // If opened in a popup (window.opener exists), postMessage to opener and self-close
  // so the parent IDE can auto-resume the ship action without a second user tap.
  const html = `<!doctype html><meta charset="utf-8"><title>${message}</title>
<body style="font-family:system-ui;background:#0b0b0b;color:#fff;padding:40px;text-align:center">
<h1>${message}</h1><p>You can close this window.</p>
<p><a style="color:#fbbf24" href="${safe}">Continue</a></p>
<script>
(function(){
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage({ type: "empire-gh-connected", login: ${loginJson}, message: ${JSON.stringify(message)} }, "*");
      setTimeout(function(){ window.close(); }, 200);
      return;
    }
  } catch(e) {}
  setTimeout(function(){ window.location.replace(${JSON.stringify(url)}); }, 1200);
})();
</script>
</body>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const ghError = url.searchParams.get("error");
    if (ghError) return htmlRedirect("https://unicornaibuilder.lovable.app/ide", `GitHub: ${ghError}`);
    if (!code || !state) return htmlRedirect("https://unicornaibuilder.lovable.app/ide", "Missing code or state");

    const stateSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const verified = await verifyState(state, stateSecret);
    if (!verified) return htmlRedirect("https://unicornaibuilder.lovable.app/ide", "Invalid or expired state");

    const clientId = Deno.env.get("GITHUB_OAUTH_CLIENT_ID")!;
    const clientSecret = Deno.env.get("GITHUB_OAUTH_CLIENT_SECRET")!;
    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ide-github-oauth-callback`;

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
    });
    const tokenJson = await tokenRes.json();
    const accessToken = tokenJson?.access_token;
    if (!accessToken) return htmlRedirect(verified.r, `Token exchange failed: ${tokenJson?.error_description ?? "no token"}`);
    const tokenType = tokenJson?.token_type ?? "bearer";
    const scopes = String(tokenJson?.scope ?? "").split(",").map((s) => s.trim()).filter(Boolean);

    const me = await fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }).then((r) => r.json());
    const ghLogin = me?.login;
    if (!ghLogin) return htmlRedirect(verified.r, "Could not read GitHub user");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: existing } = await admin
      .from("ide_github_connections")
      .select("id")
      .eq("user_id", verified.u)
      .eq("github_login", ghLogin)
      .maybeSingle();

    let connectionId = existing?.id as string | undefined;
    if (!connectionId) {
      const { data: ins, error: insErr } = await admin
        .from("ide_github_connections")
        .insert({ user_id: verified.u, github_login: ghLogin, display_name: me?.name ?? ghLogin, token_secret_ref: `vault:ide_github_tokens`, scopes, status: "active" })
        .select("id")
        .single();
      if (insErr || !ins) return htmlRedirect(verified.r, `Could not save connection: ${insErr?.message ?? "unknown"}`);
      connectionId = ins.id;
    } else {
      await admin.from("ide_github_connections").update({ scopes, status: "active", display_name: me?.name ?? ghLogin, last_used_at: new Date().toISOString() }).eq("id", connectionId);
    }

    const { error: storeErr } = await admin.rpc("service_store_ide_github_token", { _connection_id: connectionId, _access_token: accessToken, _token_type: tokenType });
    if (storeErr) return htmlRedirect(verified.r, `Could not store token: ${storeErr.message}`);

    const sep = verified.r.includes("?") ? "&" : "?";
    return htmlRedirect(`${verified.r}${sep}gh=connected&login=${encodeURIComponent(ghLogin)}`, `GitHub connected as ${ghLogin}`, ghLogin);
  } catch (e) {
    return htmlRedirect("https://unicornaibuilder.lovable.app/ide", `OAuth error: ${e instanceof Error ? e.message : String(e)}`);
  }
});
