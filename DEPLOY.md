# Deploying PayWay — Render (API + web + Postgres + Redis)

One Blueprint covers everything. Note: starter plans need a card on file;
if the employer hasn't approved spend yet, you can downgrade services to
Render's free tier in the dashboard afterwards (free web services sleep when
idle; free Postgres expires — fine for staging, not for launch).

## 1. Backend + frontend on Render (one Blueprint)
1. Render → **New → Blueprint** → select `garba-the-analyst/PayWay` → approve:
   `payway-api` + `payway-web` + `payway-db` + `payway-redis`.
2. After sync, `payway-api` → **Environment** → set (`sync: false`):
   - `PAYSTACK_SECRET_KEY` = live `sk_live_...`
   - `SETTLEMENT_WALLET_USDT` = our USDT receiving wallet
   - `ADMIN_TOKEN` is auto-generated — **copy it**.
3. `payway-web` → **Build Args** → set:
   - `NEXT_PUBLIC_PAYWAY_API` = your API URL (e.g. `https://payway-api-xxxx.onrender.com`)
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` = live `pk_live_...`
   - `NEXT_PUBLIC_ADMIN_SLUG` = long random slug → ops console at `/vault/<slug>`
   - `NEXT_PUBLIC_ADMIN_TOKEN` = the `ADMIN_TOKEN` from step 2
4. **Redeploy `payway-web`** (build args bake in at build time). API needs no redeploy.

## 2. Go live
1. Paystack dashboard → Settings → API Keys & Webhooks → webhook URL:
   `https://<api-domain>/webhooks/paystack`.
2. Optional custom domains: API + web → Render dashboard → Custom Domain.
3. Run a **$1 live test**: pay → `FIAT_AUTHORIZED` → rate locks (`CONVERTING`) →
   treasury converts → ops settles with the USDT tx hash → `SETTLED_USDT`.

## Notes
- The Docker image runs `prisma migrate deploy` on boot (`RUN_MIGRATIONS=true`).
- In-process cron runs on Render (always-on service) — no external scheduler needed.
- Free alternative later: API + web on Vercel Hobby, Postgres on Neon — the code
  already supports it (`apps/api/api/index.ts`, `POST /api/v1/ops/reconcile` +
  cron-job.org). See git history / ask the builder.
- The `cdk/` folder is the future AWS path — untouched by this setup.
