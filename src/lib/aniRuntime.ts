// Detects whether Ani's secret-backed brain can run in this deploy.
// On GitHub Pages (or any host without our edge backend) we go to safe-mode
// and surface a clear setup error rather than silently failing.

// Ani calls the public unicorn-ask edge function with the publishable key,
// so any host (Lovable, GitHub Pages, Vercel, custom domain) works as long as
// VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY are baked into the build.

export function isStaticDeploy(): boolean {
  return false;
}

export function isSafeMode(): boolean {
  // Only safe-mode if the build truly has no backend URL wired in.
  if (!import.meta.env.VITE_SUPABASE_URL) return true;
  return false;
}

export const SAFE_MODE_BANNER = {
  title: "Ani is in Safe Mode",
  body:
    "This is a static deploy. Secret-backed AI is disabled to protect API keys. " +
    "To enable Ani's brain, deploy to a host that runs the `unicorn-ask` edge function with these env vars set server-side:",
  required: ["PERPLEXITY_API_KEY"],
  optional: ["LOVABLE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"],
};
