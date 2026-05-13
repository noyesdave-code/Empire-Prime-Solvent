// Dave-only one-touch GitHub deployment trigger for the Empire site.
// Uses the server-side GitHub token; never exposes secrets to the browser.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "noyes.dave@gmail.com";
const DEFAULT_OWNER = "noyesdave-code";
const DEFAULT_REPO = "Empire-Prime-Solvent";
const DEFAULT_REPO_CANDIDATES = [DEFAULT_REPO, "unicornaibuilder", "unicorn-ai-builder", "empire", "ani"];
const DEFAULT_WORKFLOW_CANDIDATES = ["deploy-pages.yml", "deploy-pages.yaml", "pages.yml", "pages.yaml"];
const DEPLOY_WORKFLOW_PATH = ".github/workflows/deploy-pages.yml";

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function cleanName(value: unknown, label: string): string {
  const s = String(value ?? "").trim();
  if (!s) return "";
  if (!/^[A-Za-z0-9_.-]{1,100}$/.test(s)) throw new HttpError(400, `invalid ${label}`);
  return s;
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
  if (!res.ok) throw new HttpError(res.status, `GitHub ${init.method ?? "GET"} ${path}: ${json?.message ?? res.status}`);
  return json;
}

function b64(s: string): string { return btoa(unescape(encodeURIComponent(s))); }
function fromB64(s: string): string { return decodeURIComponent(escape(atob(s.replace(/\n/g, "")))); }

function workflowYaml() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const paymentsClientToken = Deno.env.get("PAYMENTS_CLIENT_TOKEN") ?? Deno.env.get("VITE_PAYMENTS_CLIENT_TOKEN") ?? "live_821a1eef30c4b062032f6b6138f";
  const projectId = new URL(supabaseUrl).hostname.split(".")[0] || "";
  return `name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

env:
  NODE_ENV: production
  VITE_SUPABASE_URL: ${supabaseUrl}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${publishableKey}
  VITE_SUPABASE_PROJECT_ID: ${projectId}
  VITE_PAYMENTS_CLIENT_TOKEN: ${paymentsClientToken}

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: package-lock.json
      - name: Install dependencies from package.json
        shell: bash
        run: npm install --include=dev
      - name: Build
        run: npm run build -- --base=/\${{ github.event.repository.name }}/
      - name: SPA fallback + nojekyll
        run: |
          cp dist/index.html dist/404.html
          mkdir -p dist/-
          cp dist/index.html dist/-/index.html
          touch dist/.nojekyll
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    outputs:
      page_url: \${{ steps.deployment.outputs.page_url }}
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4

  smoke:
    needs: deploy
    runs-on: ubuntu-latest
    continue-on-error: true
    timeout-minutes: 5
    steps:
      - name: Post-deploy smoke tests
        shell: bash
        env:
          SITE_URL: \${{ needs.deploy.outputs.page_url || format('https://{0}.github.io/{1}/', github.repository_owner, github.event.repository.name) }}
        run: |
          set -euo pipefail
          base="\${SITE_URL%/}"
          check_route() {
            local path="$1"
            local label="$2"
            local body status
            for attempt in {1..18}; do
              body="$(mktemp)"
              status="$(curl -L -sS -o "$body" -w '%{http_code}' "$base$path?smoke=$GITHUB_RUN_ID-$attempt" || true)"
              if { [ "$status" = "200" ] || [ "$status" = "404" ]; } && grep -q '<div id="root"' "$body"; then
                echo "✓ $label route served SPA shell ($status)"
                rm -f "$body"
                return 0
              fi
              rm -f "$body"
              sleep 5
            done
            echo "✗ $label route failed smoke test"
            return 1
          }
          check_route "/" "home"
          check_route "/community" "community"
          check_route "/messages" "messages"
          check_route "/spa-routing-smoke" "SPA fallback"
`;
}

async function repoHasWorkflow(token: string, owner: string, repo: string) {
  try {
    const workflows = await gh(token, `/repos/${owner}/${repo}/actions/workflows`);
    const found = (workflows?.workflows ?? []).find((w: any) => {
      const path = String(w?.path ?? "").toLowerCase();
      const file = path.split("/").pop() ?? "";
      return DEFAULT_WORKFLOW_CANDIDATES.includes(file) || /deploy|pages/i.test(String(w?.name ?? ""));
    });
    return found ? { owner, repo, workflow: found } : null;
  } catch (e) {
    if (e instanceof HttpError && [403, 404].includes(e.status)) return null;
    throw e;
  }
}

async function ensureDeployWorkflow(token: string, owner: string, repo: string, branch: string) {
  let sha: string | undefined;
  const content = workflowYaml();
  try {
    const existing = await gh(token, `/repos/${owner}/${repo}/contents/${DEPLOY_WORKFLOW_PATH}?ref=${encodeURIComponent(branch)}`);
    sha = existing?.sha;
    if (existing?.content && fromB64(String(existing.content)) === content) {
      return { owner, repo, workflow: { id: "deploy-pages.yml", name: "Deploy to GitHub Pages", path: DEPLOY_WORKFLOW_PATH }, installed: false };
    }
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 404) throw e;
  }
  await gh(token, `/repos/${owner}/${repo}/contents/${DEPLOY_WORKFLOW_PATH}`, {
    method: "PUT",
    body: JSON.stringify({
      message: sha ? "Verify Empire Pages deploy workflow" : "Install Empire Pages deploy workflow",
      content: b64(content),
      sha,
      branch,
    }),
  });
  return { owner, repo, workflow: { id: "deploy-pages.yml", name: "Deploy to GitHub Pages", path: DEPLOY_WORKFLOW_PATH }, installed: true };
}

async function pushDeployTrigger(token: string, owner: string, repo: string, branch: string) {
  const path = ".empire-deploy-trigger";
  let sha: string | undefined;
  try {
    const existing = await gh(token, `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`);
    sha = existing?.sha;
  } catch (e) {
    if (!(e instanceof HttpError) || e.status !== 404) throw e;
  }
  await gh(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    body: JSON.stringify({
      message: "Trigger Empire Pages deploy",
      content: b64(`Empire deploy trigger: ${new Date().toISOString()}\n`),
      sha,
      branch,
    }),
  });
}

async function repoExists(token: string, owner: string, repo: string) {
  try {
    await gh(token, `/repos/${owner}/${repo}`);
    return true;
  } catch (e) {
    if (e instanceof HttpError && [403, 404].includes(e.status)) return false;
    throw e;
  }
}

async function dispatchWorkflow(token: string, owner: string, repo: string, workflowId: string, ref: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await gh(token, `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
        method: "POST",
        body: JSON.stringify({ ref }),
      });
      return;
    } catch (e) {
      lastError = e;
      if (!(e instanceof HttpError) || ![404, 422].includes(e.status) || attempt === 3) throw e;
      await new Promise((resolve) => setTimeout(resolve, 1200 * attempt));
    }
  }
  throw lastError;
}

async function resolveTarget(token: string, requestedOwner: string, requestedRepo: string, requestedWorkflow: string) {
  const envOwner = cleanName(Deno.env.get("EMPIRE_GITHUB_OWNER"), "owner");
  const envRepo = cleanName(Deno.env.get("EMPIRE_GITHUB_REPO"), "repo");
  const envWorkflow = cleanName(Deno.env.get("EMPIRE_GITHUB_WORKFLOW"), "workflow");
  const me = await gh(token, "/user");

  if (requestedOwner && requestedRepo) {
    const workflows = await gh(token, `/repos/${requestedOwner}/${requestedRepo}/actions/workflows`);
    const workflow = requestedWorkflow
      ? (workflows?.workflows ?? []).find((w: any) => String(w.id) === requestedWorkflow || w.path?.endsWith(`/${requestedWorkflow}`) || w.name === requestedWorkflow)
      : (workflows?.workflows ?? []).find((w: any) => String(w?.path ?? "").endsWith(`/${DEFAULT_WORKFLOW_CANDIDATES[0]}`))
        ?? (workflows?.workflows ?? []).find((w: any) => DEFAULT_WORKFLOW_CANDIDATES.includes(String(w?.path ?? "").split("/").pop() ?? ""));
    if (!workflow) {
      try {
        return await ensureDeployWorkflow(token, requestedOwner, requestedRepo, "main");
      } catch (e) {
        if (!(e instanceof HttpError) || ![403, 404].includes(e.status)) throw e;
        await pushDeployTrigger(token, requestedOwner, requestedRepo, "main");
        return { owner: requestedOwner, repo: requestedRepo, workflow: { id: "push-trigger", name: "Push-trigger deploy", path: ".empire-deploy-trigger" }, installed: false, pushOnly: true };
      }
    }
    return { owner: requestedOwner, repo: requestedRepo, workflow, installed: false };
  }

  const ownerCandidates = Array.from(new Set([requestedOwner, envOwner, DEFAULT_OWNER, me?.login].filter(Boolean)));
  const repoCandidates = Array.from(new Set([requestedRepo, envRepo, DEFAULT_REPO, "unicornaibuilder", ...DEFAULT_REPO_CANDIDATES].filter(Boolean)));
  const workflowName = requestedWorkflow || envWorkflow;

  for (const owner of ownerCandidates) {
    for (const repo of repoCandidates) {
      if (!(await repoExists(token, owner, repo))) continue;
      let ensured: any = null;
      let scopeBlocked = false;
      try {
        ensured = await ensureDeployWorkflow(token, owner, repo, "main");
      } catch (e) {
        if (!(e instanceof HttpError) || ![403, 404].includes(e.status)) throw e;
        scopeBlocked = true;
      }
      if (ensured && (!workflowName || workflowName === "deploy-pages.yml")) return ensured;
      const target = await repoHasWorkflow(token, owner, repo);
      if (target && (!workflowName || String(target.workflow.id) === workflowName || String(target.workflow.path ?? "").endsWith(`/${workflowName}`) || target.workflow.name === workflowName)) return { ...target, installed: false };
      if (scopeBlocked) {
        await pushDeployTrigger(token, owner, repo, "main");
        return { owner, repo, workflow: { id: "push-trigger", name: "Push-trigger deploy", path: ".empire-deploy-trigger" }, installed: false, pushOnly: true };
      }
    }
  }

  for (const owner of ownerCandidates) {
    for (const repo of repoCandidates) {
      if (!(await repoExists(token, owner, repo))) continue;
      try {
        return await ensureDeployWorkflow(token, owner, repo, "main");
      } catch (e) {
        if (!(e instanceof HttpError) || ![403, 404].includes(e.status)) throw e;
        await pushDeployTrigger(token, owner, repo, "main");
        return { owner, repo, workflow: { id: "push-trigger", name: "Push-trigger deploy", path: ".empire-deploy-trigger" }, installed: false, pushOnly: true };
      }
    }
  }

  const repos = await gh(token, "/user/repos?per_page=100&sort=updated&type=all");
  for (const repo of repos ?? []) {
    const owner = repo?.owner?.login;
    const name = repo?.name;
    if (!owner || !name) continue;
    const target = await repoHasWorkflow(token, owner, name);
    if (target) return { ...target, installed: false };
  }

  throw new HttpError(404, "No accessible GitHub repo with a deploy workflow was found");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  const trace: string[] = [];
  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) throw new HttpError(500, "GITHUB_TOKEN not configured");
    trace.push("GitHub token loaded");

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) throw new HttpError(401, "missing auth");
    trace.push("User auth received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const user = userData?.user;
    if (userErr || !user) throw new HttpError(401, "not authenticated");
    if (user.email?.toLowerCase() !== OWNER_EMAIL) throw new HttpError(403, "owner only");
    trace.push(`Owner verified: ${user.email}`);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isEditor, error: editorErr } = await admin.rpc("is_site_editor", { _user_id: user.id });
    if (editorErr) throw new HttpError(500, "owner check failed");
    if (!isEditor) throw new HttpError(403, "admin role required");
    trace.push("Admin role verified");

    const body = await req.json().catch(() => ({}));
    const owner = cleanName(body.owner ?? body.repo_owner, "owner");
    const repo = cleanName(body.repo ?? body.repo_name, "repo");
    const workflow = cleanName(body.workflow ?? body.workflow_id, "workflow");
    const ref = cleanName(body.ref ?? "main", "ref") || "main";

    const target = await resolveTarget(token, owner, repo, workflow);
    trace.push(`Deploy target resolved: ${target.owner}/${target.repo}`);
    if ((target as any).pushOnly) {
      trace.push("Deploy trigger commit pushed");
    } else {
      try {
        await dispatchWorkflow(token, target.owner, target.repo, String(target.workflow.id), ref);
        trace.push(`Workflow dispatched: ${target.workflow.path ?? target.workflow.name}`);
      } catch (e) {
        if (!(e instanceof HttpError) || !/workflow_dispatch/i.test(e.message)) throw e;
        trace.push("Workflow has no manual trigger; pushing deploy trigger commit instead");
        await pushDeployTrigger(token, target.owner, target.repo, ref);
        trace.push("Deploy trigger commit pushed");
      }
    }

    let pagesUrl: string | null = null;
    try {
      const pages = await gh(token, `/repos/${target.owner}/${target.repo}/pages`);
      pagesUrl = pages?.html_url ?? null;
    } catch (_) { /* Pages may not be enabled yet. */ }

    const repoUrl = `https://github.com/${target.owner}/${target.repo}`;
    const actionsUrl = `${repoUrl}/actions/workflows/${String(target.workflow.path ?? "").split("/").pop()}`;
    return new Response(JSON.stringify({
      ok: true,
      repo_url: repoUrl,
      actions_url: actionsUrl,
      workflow_name: target.workflow.name,
      workflow_path: target.workflow.path,
      installed_workflow: target.installed,
      pages_url: pagesUrl,
      pages_warning: pagesUrl ? null : "GitHub Pages deploy was triggered; enable Pages in the repo settings if no live URL appears after the action finishes.",
      trace,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), trace }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
