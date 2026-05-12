// Per-user (or owner-fallback) Vercel deploy: pushes IDE project files
// to Vercel as a new prebuilt-style deployment using the v13 deployments API.
// Customers can pass their own vercel_token; otherwise owner uses platform VERCEL_TOKEN.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "noyes.dave@gmail.com";
const MAX_FILES = 80;
const MAX_BYTES_PER_FILE = 500_000;

class HttpError extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } }

function safePath(path: string): boolean {
  if (!path || path.length > 180) return false;
  if (path.startsWith("/") || path.includes("..") || path.includes("\\")) return false;
  if (/\.env($|\.)/i.test(path)) return false;
  if (/(^|\/)(id_rsa|id_dsa|id_ed25519|\.ssh|\.npmrc|\.netrc)$/i.test(path)) return false;
  return true;
}
function cleanProjectName(input: unknown): string {
  const v = String(input ?? "ani").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 52);
  if (!v) throw new HttpError(400, "invalid project name");
  return v;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) throw new HttpError(401, "missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: u } = await userClient.auth.getUser();
    const user = u?.user;
    if (!user) throw new HttpError(401, "not authenticated");
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const projectId = String(body.project_id ?? "").trim();
    if (!projectId) throw new HttpError(400, "project_id required");
    const projectName = cleanProjectName(body.project_name ?? "ani");
    const userVercelToken = typeof body.vercel_token === "string" && body.vercel_token.length > 10 ? body.vercel_token : null;

    let token = userVercelToken;
    if (!token) {
      if (user.email?.toLowerCase() !== OWNER_EMAIL) throw new HttpError(400, "vercel_token required (paste your Vercel personal token)");
      token = Deno.env.get("VERCEL_TOKEN") ?? null;
      if (!token) throw new HttpError(500, "VERCEL_TOKEN not configured");
    }

    const { data: project, error: pErr } = await admin.from("ide_projects").select("id,name,owner_id").eq("id", projectId).maybeSingle();
    if (pErr || !project) throw new HttpError(404, "project not found");
    if (project.owner_id !== user.id) throw new HttpError(403, "project owner mismatch");

    const { data: files, error: fErr } = await admin.from("ide_files").select("path,content,size_bytes").eq("project_id", projectId).order("path").limit(MAX_FILES);
    if (fErr || !files?.length) throw new HttpError(400, "no files to deploy");

    const vercelFiles = files
      .filter((f) => safePath(f.path) && (f.size_bytes ?? f.content.length) <= MAX_BYTES_PER_FILE)
      .map((f) => ({ file: f.path, data: f.content ?? "" }));
    if (!vercelFiles.length) throw new HttpError(400, "no safe files to deploy");

    // Auto-detect static vs node project. If no package.json, ship as static via outputDirectory "."
    const hasPkg = vercelFiles.some((f) => f.file === "package.json");
    const buildSettings = hasPkg
      ? {} // Vercel auto-detects framework
      : { builds: [{ src: "**/*", use: "@vercel/static" }] };

    const res = await fetch("https://api.vercel.com/v13/deployments", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        files: vercelFiles,
        target: "production",
        projectSettings: hasPkg ? { framework: null } : undefined,
        ...buildSettings,
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new HttpError(res.status, `Vercel: ${json?.error?.message ?? JSON.stringify(json).slice(0, 240)}`);

    const liveUrl = json?.url ? `https://${json.url}` : null;
    const inspectorUrl = json?.inspectorUrl ?? null;

    try {
      await admin.from("ide_deployments").insert({
        project_id: projectId, user_id: user.id, target: "vercel",
        repo_owner: null, repo_name: projectName,
        repo_url: inspectorUrl, live_url: liveUrl, workflow_url: inspectorUrl,
        status: "success", pushed_files: vercelFiles.length,
      });
    } catch (_) { /* best-effort */ }

    return new Response(JSON.stringify({ ok: true, pushed: vercelFiles.length, live_url: liveUrl, inspector_url: inspectorUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
