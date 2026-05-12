// Fork a template (or public project) into a new ide_project for the caller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("missing auth");
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await sb.auth.getUser();
    const user = u?.user;
    if (!user) throw new Error("not authenticated");

    const { template_slug, project_id, name } = await req.json();
    let files: Array<{ path: string; content: string; language?: string }> = [];
    let lang = "javascript";
    let projName = name || "New project";

    if (template_slug) {
      const { data: tpl, error } = await sb.from("ide_templates").select("*").eq("slug", template_slug).single();
      if (error || !tpl) throw new Error("template not found");
      files = tpl.files as any;
      lang = tpl.language;
      projName = name || tpl.name;
    } else if (project_id) {
      const { data: src, error: e1 } = await sb.from("ide_projects").select("*").eq("id", project_id).single();
      if (e1 || !src) throw new Error("source project not found");
      const { data: srcFiles } = await sb.from("ide_files").select("path, content, language").eq("project_id", project_id);
      files = srcFiles ?? [];
      lang = src.primary_language;
      projName = name || `${src.name} (fork)`;
    } else {
      throw new Error("template_slug or project_id required");
    }

    const baseSlug = slugify(projName);
    let slug = baseSlug;
    for (let i = 2; i < 50; i++) {
      const { data: exists } = await sb.from("ide_projects").select("id").eq("owner_id", user.id).eq("slug", slug).maybeSingle();
      if (!exists) break;
      slug = `${baseSlug}-${i}`;
    }

    const { data: proj, error: pErr } = await sb.from("ide_projects").insert({
      owner_id: user.id, name: projName, slug, primary_language: lang,
      fork_of: project_id ?? null,
    }).select().single();
    if (pErr || !proj) throw new Error(pErr?.message ?? "create failed");

    if (files.length) {
      await sb.from("ide_files").insert(files.map(f => ({
        project_id: proj.id, path: f.path, content: f.content,
        language: f.language ?? lang, size_bytes: (f.content ?? "").length,
      })));
    }

    return new Response(JSON.stringify({ ok: true, project: proj }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
