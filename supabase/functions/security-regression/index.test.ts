// Security regression suite — runs against the live Lovable Cloud project
// using only the anonymous publishable key. Validates that:
//  - Anonymous principals cannot read sensitive tables.
//  - Anonymous principals cannot insert into protected tables.
//  - funnel_leads input validation rejects malformed emails.
//  - Admin-only edge functions reject anonymous calls.
//
// Run via: supabase--test_edge_functions { functions: ["security-regression"] }

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

function anon() {
  return createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
}

const SENSITIVE_TABLES = [
  "memory_vectors",
  "blueprints",
  "profiles",
  "orders",
  "subscriptions",
  "site_edit_audit",
  "security_audit_runs",
  "user_roles",
  "boardroom_chat_messages",
  "sandbox_state",
];

for (const table of SENSITIVE_TABLES) {
  Deno.test(`RLS: anonymous cannot read ${table}`, async () => {
    const c = anon();
    const { data, error } = await c.from(table as never).select("id").limit(1);
    if (error) {
      // Expected denial via RLS / permission error
      assert(true, `blocked: ${error.message}`);
      return;
    }
    assertEquals(data?.length ?? 0, 0, `LEAK: anon read ${table} returned ${data?.length} row(s)`);
  });
}

Deno.test("RLS: anonymous cannot insert memory_vectors", async () => {
  const c = anon();
  const { error } = await c.from("memory_vectors" as never).insert({ content: "x" } as never);
  assert(error, "anon insert into memory_vectors must fail");
});

Deno.test("RLS: anonymous cannot insert orders", async () => {
  const c = anon();
  const { error } = await c.from("orders" as never).insert({
    email: "x@x.com", product_id: "x", amount_cents: 1,
  } as never);
  assert(error, "anon insert into orders must fail");
});

Deno.test("RLS: anonymous cannot grant themselves admin", async () => {
  const c = anon();
  const { error } = await c.from("user_roles" as never).insert({
    user_id: "00000000-0000-0000-0000-000000000000", role: "admin",
  } as never);
  assert(error, "anon must not be able to write user_roles");
});

Deno.test("Input validation: funnel_leads rejects malformed email", async () => {
  const c = anon();
  const { error } = await c.from("funnel_leads").insert({
    email: "not-an-email",
    source: "regression",
  });
  assert(error, "malformed email must be rejected by RLS check expression");
});

Deno.test("Input validation: funnel_leads accepts valid email", async () => {
  const c = anon();
  const email = `regression+${Date.now()}@unicornaibuilder.com`;
  const { error } = await c.from("funnel_leads").insert({
    email,
    source: "regression",
    stage: "test",
  });
  assertEquals(error, null);
});

const ADMIN_ONLY_FUNCTIONS = [
  "swarm-outreach",
  "swarm-seo-content",
  "swarm-defense-intel",
  "swarm-pricing",
  "swarm-sourcing",
  "security-pentest",
];

for (const fn of ADMIN_ONLY_FUNCTIONS) {
  Deno.test(`Auth: ${fn} rejects anonymous`, async () => {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: ANON },
      body: "{}",
    });
    await r.text();
    assert(
      r.status === 401 || r.status === 403,
      `${fn} returned ${r.status} — expected 401/403`,
    );
  });
}
