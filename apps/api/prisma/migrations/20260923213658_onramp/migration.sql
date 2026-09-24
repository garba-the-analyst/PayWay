-- CreateEnum
CREATE TYPE "OnrampProvider" AS ENUM ('moonpay', 'transak');

-- CreateEnum
CREATE TYPE "OnrampStatus" AS ENUM ('INITIATED', 'QUOTE_LOCKED', 'PROVIDER_HANDOFF', 'FIAT_AUTHORIZED', 'FUNDING_SENT', 'FUNDING_CONFIRMED', 'FAILED', 'EXPIRED');

-- CreateTable
CREATE TABLE "onramp_orders" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "provider" "OnrampProvider" NOT NULL DEFAULT 'moonpay',
    "provider_order_id" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "fiat_amount_minor" INTEGER NOT NULL,
    "fiat_currency" TEXT NOT NULL DEFAULT 'USD',
    "crypto_asset" TEXT NOT NULL,
    "network" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "quoted_amount" TEXT,
    "executed_amount" TEXT,
    "tx_hash" TEXT,
    "status" "OnrampStatus" NOT NULL DEFAULT 'INITIATED',
    "quote_signature" TEXT,
    "quote_expires_at" TIMESTAMP(3),
    "customer_credential" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onramp_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "funding_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "provider" "OnrampProvider" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funding_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onramp_orders_provider_order_id_key" ON "onramp_orders"("provider_order_id");

-- CreateIndex
CREATE INDEX "onramp_orders_status_created_at_idx" ON "onramp_orders"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "onramp_orders_merchant_id_idempotency_key_key" ON "onramp_orders"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "funding_events_provider_external_event_id_key" ON "funding_events"("provider", "external_event_id");

-- AddForeignKey
ALTER TABLE "funding_events" ADD CONSTRAINT "funding_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "onramp_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
