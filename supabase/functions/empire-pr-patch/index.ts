// Admin-only: Ani drafts a patch against the Empire repo.
// Dave can either push directly to the selected GitHub branch or open a PR.
// Auth: Dave (noyes.dave@gmail.com) only, gated by is_site_editor RPC.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OWNER_EMAIL = "noyes.dave@gmail.com";
const MAX_FILES = 25;
const MAX_BYTES_PER_FILE = 400_000;
const MAX_CONTEXT_FILES = 12;
const MAX_CONTEXT_BYTES = 120_000;
const MAX_PROMPT = 8_000;
const DEPLOY_WORKFLOW_CANDIDATES = ["deploy-pages.yml", "deploy-pages.yaml", "pages.yml", "pages.yaml", "ani-pages.yml"];

// Hard-coded protected paths Ani may NEVER patch via PR.
// GITHUB_TOKEN now carries the `workflow` scope, so .github/workflows/* is
// editable by Ani — only true secrets and Lovable-managed files stay locked.
const PROTECTED = [
  /^\.env/i,
  /^supabase\/migrations\//,
  /^supabase\/config\.toml$/,
  /^src\/integrations\/supabase\/(client|types)\.ts$/,
  /(^|\/)(id_rsa|\.ssh|\.npmrc|\.netrc|credentials|secrets?)$/i,
];

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function safePath(p: string): boolean {
  if (!p || p.length > 200) return false;
  if (p.startsWith("/") || p.includes("..") || p.includes("\\")) return false;
  if (!/^[A-Za-z0-9._@/+-]+$/.test(p)) return false;
  return !PROTECTED.some((re) => re.test(p));
}

function looksLikeSecret(s: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bghp_[A-Za-z0-9_]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b|\bsk-[A-Za-z0-9_-]{32,}\b|\bAKIA[0-9A-Z]{16}\b/.test(s);
}

function b64(s: string): string { return btoa(unescape(encodeURIComponent(s))); }
function fromB64(s: string): string { return decodeURIComponent(escape(atob(s.replace(/\n/g, "")))); }

function normalizeLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = { tsx: "tsx", ts: "ts", jsx: "jsx", js: "js", css: "css", html: "html", json: "json", md: "md", yml: "yaml", yaml: "yaml", toml: "toml" };
  return map[ext ?? ""] ?? "text";
}

function parseFileBlocks(reply: string): Array<{ path: string; content: string }> {
  const out: Array<{ path: string; content: string }> = [];
  const re = /```([^\s`]+)?\s+file=([^\s\n]+)\s*\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(reply))) {
    const path = String(m[2] ?? "").trim();
    const content = String(m[3] ?? "").replace(/\n$/, "");
    if (safePath(path) && content.trim() && content.length <= MAX_BYTES_PER_FILE && !looksLikeSecret(content)) out.push({ path, content });
    if (out.length >= MAX_FILES) break;
  }
  return out;
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

async function findDeployWorkflow(token: string, owner: string, repo: string) {
  const workflows = await gh(token, `/repos/${owner}/${repo}/actions/workflows`);
  return (workflows?.workflows ?? []).find((w: any) => {
    const path = String(w?.path ?? "").toLowerCase();
    const file = path.split("/").pop() ?? "";
    return DEPLOY_WORKFLOW_CANDIDATES.includes(file) || /deploy|pages/i.test(String(w?.name ?? ""));
  }) ?? null;
}

async function dispatchDeploy(token: string, owner: string, repo: string, workflowId: string | number, ref: string) {
  await gh(token, `/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`, {
    method: "POST",
    body: JSON.stringify({ ref }),
  });
}

async function collectRepoContext(token: string, owner: string, repo: string, branch: string, requested: string[]) {
  const paths = requested.filter(safePath).slice(0, MAX_CONTEXT_FILES);
  if (!paths.length) paths.push("package.json", "src/App.tsx", "src/pages/Index.tsx", "src/index.css", "tailwind.config.ts");
  const chunks: string[] = [];
  let total = 0;
  for (const path of paths) {
    if (total >= MAX_CONTEXT_BYTES) break;
    try {
      const file = await gh(token, `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
      if (file?.type !== "file" || !file?.content || Number(file?.size ?? 0) > 80_000) continue;
      const content = fromB64(String(file.content));
      chunks.push(`--- ${path} (${normalizeLanguage(path)}) ---\n${content.slice(0, 80_000)}`);
      total += content.length;
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 404) throw e;
    }
  }
  return chunks.join("\n\n") || "(no repo context loaded)";
}

async function draftFilesWithAni(prompt: string, repoContext: string): Promise<Array<{ path: string; content: string }>> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new HttpError(500, "LOVABLE_API_KEY missing");
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: "You are Ani, Dave's admin code patch drafter for the Empire repo. Return complete replacement files only. Use fenced blocks exactly like ```tsx file=src/App.tsx. Never include secrets, .env files, tokens, private keys, malware, or destructive operations. Keep changes focused on the requested feature." },
        { role: "user", content: `Repo context:\n${repoContext}\n\nRequested Empire change:\n${prompt}` },
      ],
    }),
  });
  if (!res.ok) throw new HttpError(res.status, `Ani draft failed: ${await res.text()}`);
  const json = await res.json();
  const reply = String(json?.choices?.[0]?.message?.content ?? "");
  const files = parseFileBlocks(reply);
  if (!files.length) throw new HttpError(400, "Ani did not return safe file blocks");
  return files;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = Deno.env.get("GITHUB_TOKEN");
    if (!token) throw new HttpError(500, "GITHUB_TOKEN not configured");

    const auth = req.headers.get("Authorization") ?? "";
    const jwt = auth.replace(/^Bearer\s+/i, "");
    if (!jwt) throw new HttpError(401, "missing auth");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    const user = u?.user;
    if (uErr || !user) throw new HttpError(401, "not authenticated");
    if (user.email?.toLowerCase() !== OWNER_EMAIL) throw new HttpError(403, "owner only");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isEditor } = await admin.rpc("is_site_editor", { _user_id: user.id });
    if (!isEditor) throw new HttpError(403, "admin role required");

    const body = await req.json();
    const empireOwner = String(body.owner ?? "").trim();
    const empireRepo = String(body.repo ?? "").trim();
    const baseBranch = String(body.base ?? "main").trim();
    const title = String(body.title ?? "Ani patch").trim().slice(0, 140);
    const description = String(body.description ?? "").trim().slice(0, 4000);
    const prompt = String(body.prompt ?? "").trim().slice(0, MAX_PROMPT);
    const mode = String(body.mode ?? "direct").trim().toLowerCase() === "pr" ? "pr" : "direct";
    const deploy = body.deploy !== false;
    let files = Array.isArray(body.files) ? body.files : [];
    const contextPaths = Array.isArray(body.context_paths) ? body.context_paths.map((p: unknown) => String(p ?? "")) : [];

    if (!empireOwner || !empireRepo) throw new HttpError(400, "owner and repo required");
    if (!files.length && !prompt) throw new HttpError(400, "no files or Ani prompt in patch");
    if (files.length > MAX_FILES) throw new HttpError(400, `too many files (max ${MAX_FILES})`);

    if (!files.length && prompt) {
      const repoContext = await collectRepoContext(token, empireOwner, empireRepo, baseBranch, contextPaths);
      files = await draftFilesWithAni(prompt, repoContext);
    }

    // Validate every file BEFORE touching GitHub.
    const safeFiles: Array<{ path: string; content: string }> = [];
    for (const f of files) {
      const path = String(f?.path ?? "").trim();
      const content = String(f?.content ?? "");
      if (!safePath(path)) throw new HttpError(400, `blocked path: ${path}`);
      if (content.length > MAX_BYTES_PER_FILE) throw new HttpError(400, `file too large: ${path}`);
      if (looksLikeSecret(content)) throw new HttpError(400, `secret-like content blocked in ${path}`);
      safeFiles.push({ path, content });
    }

    // Get base branch SHA.
    const baseRef = await gh(token, `/repos/${empireOwner}/${empireRepo}/git/ref/heads/${encodeURIComponent(baseBranch)}`);
    const baseSha = baseRef?.object?.sha;
    if (!baseSha) throw new HttpError(500, "could not read base branch");

    // Create new branch for PR mode; direct mode updates Dave's selected branch.
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const branch = mode === "pr" ? `ani/patch-${ts}` : baseBranch;
    if (mode === "pr") {
      await gh(token, `/repos/${empireOwner}/${empireRepo}/git/refs`, {
        method: "POST",
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
      });
    }

    // Commit each file on the new branch.
    let pushed = 0;
    for (const f of safeFiles) {
      let sha: string | undefined;
      try {
        const existing = await gh(token, `/repos/${empireOwner}/${empireRepo}/contents/${encodeURIComponent(f.path).replace(/%2F/g, "/")}?ref=${encodeURIComponent(branch)}`);
        sha = existing?.sha;
      } catch (e) {
        if (!(e instanceof HttpError) || e.status !== 404) throw e;
      }
      await gh(token, `/repos/${empireOwner}/${empireRepo}/contents/${encodeURIComponent(f.path).replace(/%2F/g, "/")}`, {
        method: "PUT",
        body: JSON.stringify({
          message: `Ani: ${title}`,
          content: b64(f.content),
          sha,
          branch,
        }),
      });
      pushed++;
    }

    let pr: any = null;
    if (mode === "pr") {
      pr = await gh(token, `/repos/${empireOwner}/${empireRepo}/pulls`, {
        method: "POST",
        body: JSON.stringify({
          title,
          head: branch,
          base: baseBranch,
          body: `${description}\n\n---\nDrafted by Ani via Empire admin patch flow.`,
          maintainer_can_modify: true,
        }),
      });
    }

    let workflowUrl: string | null = null;
    let deployWarning: string | null = null;
    if (mode === "direct" && deploy) {
      try {
        const workflow = await findDeployWorkflow(token, empireOwner, empireRepo);
        if (workflow?.id) {
          try {
            await dispatchDeploy(token, empireOwner, empireRepo, workflow.id, baseBranch);
          } catch (_e) {
            // Workflow has no manual trigger — push to main already kicked
            // off pages-build-deployment automatically. Nothing to do.
          }
          workflowUrl = `https://github.com/${empireOwner}/${empireRepo}/actions/workflows/${String(workflow.path ?? "").split("/").pop()}`;
        } else {
          // GitHub Pages still auto-builds on push to main when Pages is enabled.
          workflowUrl = `https://github.com/${empireOwner}/${empireRepo}/actions`;
        }
      } catch (e) {
        deployWarning = e instanceof Error ? e.message : String(e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      pushed,
      mode,
      branch,
      pr_url: pr?.html_url ?? null,
      pr_number: pr?.number ?? null,
      repo_url: `https://github.com/${empireOwner}/${empireRepo}`,
      workflow_url: workflowUrl,
      live_url: `https://${empireOwner}.github.io/${empireRepo}/`,
      deploy_warning: deployWarning,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
