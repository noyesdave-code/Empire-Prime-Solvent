// Execute code in an E2B Firecracker microVM and return stdout/stderr.
// Auth required. Logs every run to ide_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const E2B_API = "https://api.e2b.dev";
const MAX_SOURCE = 200_000;
const MAX_OUT = 20_000;

type Lang = "python" | "javascript" | "typescript" | "bash";
const TEMPLATE: Record<Lang, string> = {
  python: "code-interpreter-v1",
  javascript: "code-interpreter-v1",
  typescript: "code-interpreter-v1",
  bash: "code-interpreter-v1",
};

async function runInE2B(language: Lang, source: string, apiKey: string) {
  // Create sandbox
  const created = await fetch(`${E2B_API}/sandboxes`, {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ templateID: TEMPLATE[language], timeout: 30 }),
  });
  if (!created.ok) {
    const t = await created.text();
    throw new Error(`sandbox create failed [${created.status}]: ${t}`);
  }
  const { sandboxID } = await created.json();

  try {
    // Execute via code-interpreter cell endpoint
    const lang = language === "typescript" ? "javascript" : language;
    const exec = await fetch(`${E2B_API}/sandboxes/${sandboxID}/code`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ code: source, language: lang }),
    });
    const text = await exec.text();
    let stdout = "", stderr = "", exitCode = 0;
    try {
      const j = JSON.parse(text);
      stdout = (j.logs?.stdout ?? []).join("");
      stderr = (j.logs?.stderr ?? []).join("");
      if (j.error) { stderr += `\n${j.error.name}: ${j.error.value}\n${j.error.traceback ?? ""}`; exitCode = 1; }
    } catch {
      stdout = text;
    }
    return {
      stdout: stdout.slice(0, MAX_OUT),
      stderr: stderr.slice(0, MAX_OUT),
      exitCode,
    };
  } finally {
    // Best-effort cleanup
    fetch(`${E2B_API}/sandboxes/${sandboxID}`, {
      method: "DELETE",
      headers: { "X-API-Key": apiKey },
    }).catch(() => {});
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("method not allowed", { status: 405, headers: corsHeaders });

  try {
    const E2B_KEY = Deno.env.get("E2B_API_KEY");
    if (!E2B_KEY) throw new Error("E2B_API_KEY not configured");

    // Auth
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("missing auth");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user) throw new Error("not authenticated");

    const body = await req.json();
    const language = String(body.language ?? "javascript").toLowerCase() as Lang;
    const source = String(body.source ?? "");
    const projectId = body.project_id ?? null;
    if (!["python", "javascript", "typescript", "bash"].includes(language))
      throw new Error("unsupported language");
    if (!source.trim()) throw new Error("empty source");
    if (source.length > MAX_SOURCE) throw new Error("source too large");

    const t0 = Date.now();
    const out = await runInE2B(language, source, E2B_KEY);
    const duration = Date.now() - t0;

    // Log run (best-effort)
    sb.from("ide_runs").insert({
      project_id: projectId,
      user_id: user.id,
      language,
      source_preview: source.slice(0, 1000),
      stdout_preview: out.stdout.slice(0, 4000),
      stderr_preview: out.stderr.slice(0, 4000),
      exit_code: out.exitCode,
      duration_ms: duration,
      provider: "e2b",
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, ...out, duration_ms: duration }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
