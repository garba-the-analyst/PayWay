# PayWay — Card Collections Settled as USDT

Clients pay with any global card. No accounts, no verification. Fiat is captured
via our merchant collectors, converted at a locked USDT rate, and settled to our
wallet. Paystack collects the cards. USD in, USDT out.

> **Hosting:** API on Render + web on Vercel — see [DEPLOY.md](./DEPLOY.md) for the one-click setup.

## Quickstart

```bash
cp .env.example .env
docker compose up -d            # postgres + redis
cd apps/api && pnpm install && pnpm dev
```

Prisma (custom Postgres — the only database; no BaaS anywhere):

```bash
# local Postgres (docker-compose, or your own instance via DATABASE_URL)
npx prisma migrate dev   # run from apps/api
```

## Endpoints

- `POST /api/v1/pay` (headers `Idempotency-Key*`, `X-Merchant-Id`) → hosted checkout URL
- `GET /api/v1/pay/:id` — tracker polling
- `GET /api/v1/pay` — ops list (admin token)
- `POST /api/v1/pay/:id/settle {txHash, executedUsdt}` — ops settlement (admin token)
- `POST /webhooks/paystack`
- `GET /health`, `GET /health/ready`

## Money flow

`INITIATED` (checkout created) → `FIAT_AUTHORIZED` (card captured, webhook) →
`CONVERTING` (USDT rate locked, obligation recorded) → `SETTLED_USDT` (ops or
exchange confirms on-chain transfer). `FAILED` / `REFUNDED` terminal otherwise.

## Compliance posture

Payers face zero friction: no accounts, no KYC. PayWay the business completes
one merchant verification (KYB) with each collector. Card data stays inside the
collectors' hosted checkout (SAQ-A). Treasury converts fiat → USDT; PayWay the
app only records quotes, obligations, and settlement proofs (tx hashes).

## Frontend (`apps/web`, Next.js — obsidian/silver)

```bash
cd apps/web && cp .env.example .env.local && pnpm install && pnpm dev  # :3100
```

Pages: `/` pay form (amount + email → hosted checkout), `/pay/[id]` 3s tracker
(fiat → converting → settled, Tronscan link), `/vault/<ADMIN_SLUG>` ops console —
unlinked, reachable only with the secret slug plus `ADMIN_TOKEN`.
