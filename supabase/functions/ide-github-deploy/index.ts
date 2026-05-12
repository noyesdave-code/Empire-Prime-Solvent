// Owner-only IDE deploy: pushes an Empire IDE project to a GitHub repo named `ani`
// by default, then installs/updates a GitHub Pages workflow. No secrets are exposed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "noyes.dave@gmail.com";
const MAX_FILES = 80;
const MAX_BYTES_PER_FILE = 500_000;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function cleanRepoName(input: unknown): string {
  const value = String(input ?? "ani").trim().toLowerCase();
  if (!/^[a-z0-9._-]{1,100}$/.test(value)) throw new HttpError(400, "invalid repo name");
  return value;
}

function safePath(path: string): boolean {
  if (!path || path.length > 180) return false;
  if (path.startsWith("/") || path.includes("..") || path.includes("\\")) return false;
  if (/\.env($|\.)/i.test(path)) return false;
  if (/(^|\/)(id_rsa|id_dsa|id_ed25519|\.ssh|\.npmrc|\.netrc)$/i.test(path)) return false;
  return true;
}

function b64(content: string): string {
  return btoa(unescape(encodeURIComponent(content)));
}

async function gh(token: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: any = null;
  try { json = text ? JSON.parse(text) : null; } catch { json = { message: text }; }
  if (!res.ok) throw new HttpError(res.status, `GitHub ${init.method ?? "GET"} ${path}: ${json?.message ?? `GitHub ${res.status}`}`);
  return json;
}

async function ensureRepo(token: string, owner: string, repo: string) {
  try {
    return await gh(token, `/repos/${owner}/${repo}`);
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 404) throw e;
  }
  return await gh(token, "/user/repos", {
    method: "POST",
    body: JSON.stringify({ name: repo, private: false, auto_init: true, description: "Ani build workspace from Empire IDE" }),
  });
}

async function upsertFile(token: string, owner: string, repo: string, path: string, content: string, message: string) {
  let sha: string | undefined;
  try {
    const existing = await gh(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`);
    sha = existing?.sha;
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 404) throw e;
  }
  return await gh(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    body: JSON.stringify({ message, content: b64(content), sha }),
  });
}

const PAGES_WORKFLOW = `name: Ani Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: ani-pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Build or stage files
        shell: bash
        run: |
          if [ -f package.json ]; then
            npm install
            npm run build --if-present
          fi
          if [ -d dist ]; then
            echo "dist ready"
          elif [ -d build ]; then
            mv build dist
          else
            mkdir -p dist
            rsync -av --exclude='.git' --exclude='.github' ./ dist/
          fi
          cp dist/index.html dist/404.html 2>/dev/null || true
          touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
`;

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
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) throw new HttpError(401, "not authenticated");

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await req.json();
    const projectId = String(body.project_id ?? "").trim();
    const repo = cleanRepoName(body.repo_name);
    const connectionId = typeof body.connection_id === "string" ? body.connection_id : null;
    if (!projectId) throw new HttpError(400, "project_id required");

    // Determine token: per-user connection (preferred) or owner fallback
    let token: string | null = null;
    let owner = "";
    if (connectionId) {
      const { data: conn, error: connErr } = await admin
        .from("ide_github_connections")
        .select("id,user_id,github_login,status")
        .eq("id", connectionId)
        .maybeSingle();
      if (connErr || !conn) throw new HttpError(404, "github connection not found");
      if (conn.user_id !== user.id) throw new HttpError(403, "connection does not belong to you");
      if (conn.status !== "active") throw new HttpError(400, "github connection is not active");
      const { data: tok, error: tokErr } = await admin.rpc("service_get_ide_github_token", { _connection_id: connectionId });
      if (tokErr || !tok) throw new HttpError(500, "could not load github token");
      token = String(tok);
      owner = String(body.repo_owner ?? conn.github_login).trim();
      await admin.from("ide_github_connections").update({ last_used_at: new Date().toISOString() }).eq("id", connectionId);
    } else {
      // Owner fallback uses platform GITHUB_TOKEN — owner-only
      if (user.email?.toLowerCase() !== OWNER_EMAIL) throw new HttpError(403, "connect your GitHub account first");
      const { data: isEditor, error: editorErr } = await admin.rpc("is_site_editor", { _user_id: user.id });
      if (editorErr) throw new HttpError(500, "owner check failed");
      if (!isEditor) throw new HttpError(403, "admin role required");
      token = Deno.env.get("GITHUB_TOKEN") ?? null;
      if (!token) throw new HttpError(500, "GITHUB_TOKEN not configured");
      const me = await gh(token, "/user");
      owner = String(body.repo_owner ?? me.login ?? "").trim();
    }
    if (!owner) throw new HttpError(400, "repo owner missing");


    const { data: project, error: projectErr } = await admin
      .from("ide_projects")
      .select("id,name,owner_id")
      .eq("id", projectId)
      .maybeSingle();
    if (projectErr || !project) throw new HttpError(404, "project not found");
    if (project.owner_id !== user.id) throw new HttpError(403, "project owner mismatch");

    const { data: files, error: filesErr } = await admin
      .from("ide_files")
      .select("path,content,size_bytes")
      .eq("project_id", projectId)
      .order("path")
      .limit(MAX_FILES);
    if (filesErr) throw new HttpError(500, "could not read files");
    if (!files?.length) throw new HttpError(400, "no files to deploy");

    await ensureRepo(token, owner, repo);
    const message = `Ani deploy: ${project.name}`;
    let pushed = 0;
    for (const f of files as Array<{ path: string; content: string; size_bytes: number }>) {
      if (!safePath(f.path)) continue;
      if ((f.size_bytes ?? f.content.length) > MAX_BYTES_PER_FILE) continue;
      await upsertFile(token, owner, repo, f.path, f.content ?? "", message);
      pushed++;
    }
    let workflow_warning: string | null = null;
    try {
      await upsertFile(token, owner, repo, ".github/workflows/ani-pages.yml", PAGES_WORKFLOW, "Install Ani GitHub Pages deploy workflow");
    } catch (e) {
      if (e instanceof HttpError && [403, 404].includes(e.status)) {
        workflow_warning = "GitHub repo/files were pushed, but this token cannot create workflow files. Pages will use the main branch instead.";
      } else {
        throw e;
      }
    }

    let pages_warning: string | null = null;
    try {
      await gh(token, `/repos/${owner}/${repo}/pages`, { method: "POST", body: JSON.stringify({ source: { branch: "main", path: "/" } }) });
    } catch (e) {
      if (e instanceof HttpError && [404, 409, 422].includes(e.status)) {
        pages_warning = "GitHub repo/files were pushed, but Pages setup needs to be enabled from GitHub if the live URL is not active yet.";
      } else {
        throw e;
      }
    }

    const repoUrl = `https://github.com/${owner}/${repo}`;
    const pagesUrl = `https://${owner}.github.io/${repo}/`;
    const workflowUrl = `https://github.com/${owner}/${repo}/actions/workflows/ani-pages.yml`;
    try {
      await admin.from("ide_deployments").insert({
        project_id: projectId, user_id: user.id, target: "github_pages",
        connection_id: connectionId, repo_owner: owner, repo_name: repo,
        repo_url: repoUrl, live_url: pagesUrl, workflow_url: workflowUrl,
        status: "success", pushed_files: pushed,
      });
    } catch (_) { /* best-effort log */ }

    return new Response(JSON.stringify({
      ok: true, pushed,
      repo_url: repoUrl, pages_url: pagesUrl, workflow_url: workflowUrl,
      workflow_warning, pages_warning,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});