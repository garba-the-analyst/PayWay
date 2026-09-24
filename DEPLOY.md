# Deploying PayWay — free tier: Vercel (API + web) + Neon (Postgres)

No credit card required anywhere. Redis is skipped — idempotency is enforced by
Postgres constraints; the Redis fast-path simply stays dormant without `REDIS_URL`.

## 1. Database on Neon (free)
1. [neon.tech](https://neon.tech) → New Project (region closest to you/EU) → copy the
   **connection string** (pooled or direct — either works at this scale).
2. Apply the schema once, from this machine:
   ```bash
   cd apps/api
   DATABASE_URL="<neon-string>" ./node_modules/.bin/prisma migrate deploy
   ```

## 2. API on Vercel (free Hobby)
1. Vercel → Add New → Project → this repo → **Root Directory: `apps/api`**
   (serverless entry `api/index.ts` + rewrites are in `apps/api/vercel.json`).
2. Environment variables:
   - `DATABASE_URL` = the Neon string from step 1
   - `PAYSTACK_SECRET_KEY` = live `sk_live_...`
   - `ADMIN_TOKEN` = a long random string (**copy it** for the web app + scheduler)
   - `SETTLEMENT_WALLET_USDT` = our USDT receiving wallet
3. Deploy. Note the URL, e.g. `https://payway-api.vercel.app`.
4. In-process cron does **not** run on serverless — schedule the safety net free at
   [cron-job.org](https://cron-job.org): `POST https://<api>/api/v1/ops/reconcile`
   with header `x-admin-token: <ADMIN_TOKEN>`, every 5 minutes.

## 3. Frontend on Vercel (free Hobby)
1. Vercel → Add New → Project → same repo → **Root Directory: `apps/web`**.
2. Environment variables:
   - `NEXT_PUBLIC_PAYWAY_API` = your API URL from step 2
   - `NEXT_PUBLIC_MERCHANT_ID` = e.g. `demo_merchant`
   - `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` = live `pk_live_...`
   - `NEXT_PUBLIC_ADMIN_SLUG` = long random slug → ops console at `/vault/<slug>`
   - `NEXT_PUBLIC_ADMIN_TOKEN` = the `ADMIN_TOKEN` from step 2
3. Deploy.

## 4. Go live
1. Paystack dashboard → Settings → API Keys & Webhooks → webhook URL:
   `https://<api-domain>/webhooks/paystack`.
2. Run a **$1 live test**: pay → `FIAT_AUTHORIZED` → rate locks (`CONVERTING`) →
   treasury converts → ops settles with the USDT tx hash → `SETTLED_USDT`.

## Notes
- Cold starts: the API boots Nest per warm container (~2–5s on first hit, fast after).
- If traffic ever outgrows Hobby limits, the paid fallback is Render (`render.yaml`
  still in-repo) or AWS (`cdk/`), with zero code changes — only env vars move.
