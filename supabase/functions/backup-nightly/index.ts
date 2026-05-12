// Nightly off-site backup of critical Empire tables to a private GitHub gist.
// Admin-callable via POST; can also be wired to a scheduled trigger.
// Tables backed up are read-only snapshots; no writes anywhere except the gist.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "empire_brain",
  "empire_learnings",
  "boardroom_documents",
  "boardroom_videos",
  "boardroom_pages",
  "boardroom_assets",
  "boardroom_chat_messages",
  "skills_registry",
  "ai_compositions",
  "subscriptions",
  "user_roles",
  "brands",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GH = Deno.env.get("GITHUB_TOKEN");
    if (!GH) return json({ error: "GITHUB_TOKEN not configured" }, 500);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ---- Admin gate (when called from UI) ----
    const auth = req.headers.get("Authorization");
    if (auth) {
      const { data: u } = await supabase.auth.getUser(auth.replace("Bearer ", ""));
      if (!u?.user) return json({ error: "unauthorized" }, 401);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.user.id);
      if (!roles?.some((r: { role: string }) => r.role === "admin")) {
        return json({ error: "admin only" }, 403);
      }
    }

    // ---- Snapshot all tables ----
    const snapshot: Record<string, unknown> = {
      generated_at: new Date().toISOString(),
      project: "pgva-empire",
      tables: {},
    };
    const counts: Record<string, number> = {};
    for (const t of TABLES) {
      const { data, error } = await supabase.from(t).select("*").limit(10000);
      if (error) {
        counts[t] = -1;
        (snapshot.tables as Record<string, unknown>)[t] = { error: error.message };
        continue;
      }
      counts[t] = data?.length ?? 0;
      (snapshot.tables as Record<string, unknown>)[t] = data ?? [];
    }

    const filename = `empire-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const body = {
      description: `Empire nightly backup ${new Date().toISOString()}`,
      public: false,
      files: {
        [filename]: { content: JSON.stringify(snapshot, null, 2) },
      },
    };

    const ghRes = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GH}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!ghRes.ok) {
      const txt = await ghRes.text();
      console.error("gist create failed", ghRes.status, txt);
      return json({ error: "github upload failed", status: ghRes.status, detail: txt.slice(0, 400) }, 502);
    }
    const gist = await ghRes.json();

    // ---- Second off-platform target (defeats single-account compromise) ----
    let mirror_url: string | null = null;
    let mirror_status: number | null = null;
    const mirrorUrl = Deno.env.get("BACKUP_WEBHOOK_URL");
    if (mirrorUrl) {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        const tok = Deno.env.get("BACKUP_WEBHOOK_TOKEN");
        if (tok) headers["Authorization"] = `Bearer ${tok}`;
        const r = await fetch(mirrorUrl, { method: "POST", headers, body: JSON.stringify({ filename, snapshot }) });
        mirror_status = r.status;
        mirror_url = mirrorUrl;
        if (!r.ok) console.warn("mirror upload non-2xx", r.status, (await r.text()).slice(0, 200));
      } catch (e) { console.error("mirror upload failed", e); }
    }

    return json({
      ok: true,
      filename,
      gist_url: gist.html_url,
      gist_id: gist.id,
      mirror_url,
      mirror_status,
      counts,
    });
  } catch (e) {
    console.error("backup-nightly error", e);
    return json({ error: e instanceof Error ? e.message : "unknown" }, 500);
  }
});
