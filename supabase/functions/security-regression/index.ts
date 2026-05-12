// Test-only folder. This stub exists so the Supabase functions deployer
// does not crash on an empty directory. The real test suite lives in
// `index.test.ts` and is executed via the test runner — never via HTTP.
Deno.serve(() => new Response("not found", { status: 404 }));
