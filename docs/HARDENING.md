# Empire Hardening Playbook

Owner-only ops doc. Step-by-step links and rotation drills for the live stack.

---

## 1. UptimeRobot — external pinger (FREE)

Live URLs to monitor:
- Frontend: `https://noyesdave-code.github.io/Empire-Prime-Solvent/health.json`
- Backend health: `https://lkzxpvleikvvbuhmsgaa.supabase.co/functions/v1/health`

Steps:
1. Sign up: https://uptimerobot.com/signUp
2. Dashboard → **+ New Monitor**
3. Monitor type: **HTTP(s)** · Interval: **5 minutes**
4. Add the two URLs above (one monitor each)
5. Alert contacts → add your email + (optional) SMS
6. Save. Done.

---

## 2. Off-site backup (second target beyond the GitHub gist)

`backup-nightly` already mirrors to a private gist. To add a second
independent target, pick ONE of these, then add the matching secrets via
Lovable Cloud → Connectors:

**Cloudflare R2 (recommended — free 10 GB):**
- Create bucket: https://dash.cloudflare.com/?to=/:account/r2
- Generate API token with `Object Read & Write` scope
- Add secrets: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`

**Backblaze B2 (free 10 GB):**
- Sign up: https://www.backblaze.com/b2/sign-up.html
- Create bucket + app key
- Add secrets: `B2_KEY_ID`, `B2_APPLICATION_KEY`, `B2_BUCKET`

`backup-nightly` will auto-detect and upload to whichever target is configured.

---

## 3. Rate-limit on `unicorn-ask` (Ani chat) — DONE

Already enforced server-side:
- 10 free questions per IP (lifetime)
- 8 requests / 60s burst cap per IP
- 2000 anonymous prompts/hour global ceiling
- Duplicate-prompt 5s cooldown

No action needed.

---

## 4. Secret rotation playbook

| Secret | Rotate every | Where to revoke / regenerate |
|---|---|---|
| `GITHUB_TOKEN` | 90 days | https://github.com/settings/tokens — delete old, generate new (scopes: `repo`, `gist`), update in Lovable Cloud → Secrets |
| `PADDLE_LIVE_API_KEY` | 180 days or on incident | https://vendors.paddle.com/authentication-v2 — revoke + regenerate, update in Lovable Cloud |
| `PERPLEXITY_API_KEY` | 90 days | https://www.perplexity.ai/settings/api — rotate, update via Connectors |
| `E2B_API_KEY` | 180 days | https://e2b.dev/dashboard → API Keys |
| `VERCEL_TOKEN` | 180 days | https://vercel.com/account/tokens |
| `GITHUB_OAUTH_CLIENT_SECRET` | 365 days | https://github.com/settings/developers → your OAuth App → "Generate new client secret" |
| `RESEND_API_KEY` | 180 days | https://resend.com/api-keys (managed via Connectors) |
| `LOVABLE_API_KEY` | On incident | Lovable → AI Gateway → Rotate (do NOT delete via Secrets tool) |

**Drill (run quarterly):**
1. Pick one secret → revoke at provider.
2. Confirm the dependent edge function returns a 5xx on next call.
3. Generate new secret → paste into Lovable Cloud → redeploy affected functions.
4. Confirm green via `/boardroom/health`.

---

## 5. DNS-level WAF / DDoS — Cloudflare custom domain

GitHub Pages has no WAF. Once you own a domain (e.g. `theempire.app`):

1. Buy domain — Cloudflare Registrar (at-cost): https://dash.cloudflare.com/?to=/:account/registrar/register
2. Add site to Cloudflare: https://dash.cloudflare.com (Add Site)
3. DNS → add `CNAME @ noyesdave-code.github.io` (proxied = orange cloud ON)
4. Add a `CNAME` file to repo root containing the bare domain.
5. Cloudflare → **Security → WAF** → enable **Managed Rules** (Free plan)
6. Cloudflare → **Security → Bots** → enable **Bot Fight Mode** (free)
7. Cloudflare → **SSL/TLS** → set to **Full (strict)**

Result: free WAF, free bot mitigation, free DDoS protection at the edge.

---

## 6. Cookie / GDPR consent — DONE

`<CookieConsent />` is mounted globally. Honors GPC automatically. No
non-essential trackers fire until the user clicks Accept.

---

## 7. Sentry observability

Install + DSN:
1. Sign up: https://sentry.io/signup/
2. Create project → **React**
3. Copy the DSN (looks like `https://abc@o123.ingest.sentry.io/456`)
4. Add **Build Secret** in Lovable workspace settings:
   `VITE_SENTRY_DSN = <your DSN>`
5. Push — `initSentry()` auto-loads on next deploy.

(If `@sentry/react` isn't installed yet: `bun add @sentry/react`.)

---

## 8. CI test gate — DONE

`.github/workflows/deploy-pages.yml` now runs `vitest` before deploying.
A red test = no deploy.
