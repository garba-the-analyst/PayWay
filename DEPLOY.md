# Deploying PayWay — Render (API) + Vercel (web)

## 1. Backend on Render (one click)
1. Render → **New → Blueprint** → select this repo (`render.yaml` is at the root).
2. Approve the plan: `payway-api` (Docker, starter) + `payway-db` (Postgres) + `payway-redis` (Key Value).
3. After sync, open `payway-api` → **Environment** and set the secrets (all `sync: false`):
   - `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET` (merchant KYB first)
   - `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_SECRET` (failover)
   - `SETTLEMENT_WALLET_USDT` — our USDT receiving wallet
   - `ADMIN_TOKEN` is auto-generated — **copy it** for step 2.
4. Deploy. Health check is `GET /health`. The Docker image runs `prisma migrate deploy`
   on boot (`RUN_MIGRATIONS=true`), so the custom Postgres schema is applied automatically.

## 2. Frontend on Vercel (one click)
1. Vercel → **Add New → Project** → select this repo, set **Root Directory** to `apps/web` (config already in `apps/web/vercel.json`).
2. Environment variables:
   - `NEXT_PUBLIC_PAYWAY_API` = `https://payway-api.onrender.com` (your Render URL)
   - `NEXT_PUBLIC_MERCHANT_ID` = e.g. `demo_merchant`
   - `NEXT_PUBLIC_ADMIN_SLUG` = long random slug → ops console lives at `/vault/<slug>`
   - `NEXT_PUBLIC_ADMIN_TOKEN` = the API's `ADMIN_TOKEN` from step 1
3. Deploy.

## 3. Go live
1. Point DNS: web domain → Vercel, `api.<domain>` → Render (Render dashboard → Custom Domain).
2. In the Paystack/Flutterwave dashboards, set the webhook URL to
   `https://<api-domain>/webhooks/paystack` (and `/webhooks/flutterwave`).
3. Run a **$1 live test** with a real card: pay → `FIAT_AUTHORIZED` → rate locks
   (`CONVERTING`) → treasury converts → ops settles with the USDT tx hash → `SETTLED_USDT`.

## Notes
- `DEFAULT_CURRENCY=USD` is baked into the Blueprint; v1 collects USD only.
- Conversion execution (exchange API vs manual treasury) is an ops decision —
  the app records quotes, obligations, and settlement proofs either way.
- The `cdk/` folder is the future AWS path — untouched by this setup.
