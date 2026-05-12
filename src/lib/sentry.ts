// Lazy-load Sentry only when a DSN is configured. Uses a runtime-resolved
// specifier so Rollup doesn't try to bundle @sentry/react when it isn't installed.
export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;
  try {
    const pkg = "@sentry/react";
    const Sentry = (await import(/* @vite-ignore */ pkg)) as { init: (cfg: Record<string, unknown>) => void };
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  } catch (e) {
    console.warn("Sentry init skipped:", e);
  }
}
