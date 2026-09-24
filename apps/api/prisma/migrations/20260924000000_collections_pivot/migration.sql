-- CreateEnum
CREATE TYPE "CollectionProvider" AS ENUM ('paystack', 'flutterwave');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('INITIATED', 'FIAT_AUTHORIZED', 'CONVERTING', 'SETTLED_USDT', 'FAILED', 'REFUNDED');

-- DropForeignKey
ALTER TABLE "funding_events" DROP CONSTRAINT "funding_events_order_id_fkey";

-- DropTable
DROP TABLE "funding_events";

-- DropTable
DROP TABLE "onramp_orders";

-- DropEnum
DROP TYPE "OnrampProvider";

-- DropEnum
DROP TYPE "OnrampStatus";

-- CreateTable
CREATE TABLE "collection_orders" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "CollectionProvider" NOT NULL DEFAULT 'paystack',
    "provider_reference" TEXT,
    "auth_url" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "fiat_amount_minor" INTEGER NOT NULL,
    "fiat_currency" TEXT NOT NULL DEFAULT 'USD',
    "email" TEXT,
    "status" "CollectionStatus" NOT NULL DEFAULT 'INITIATED',
    "quoted_usdt" TEXT,
    "rate_locked_at" TIMESTAMP(3),
    "executed_usdt" TEXT,
    "tx_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_events" (
    "id" TEXT NOT NULL,
    "order_id" TEXT,
    "provider" "CollectionProvider" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_idempotency" (
    "key" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "resp_code" INTEGER NOT NULL,
    "resp_body" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_idempotency_pkey" PRIMARY KEY ("merchant_id","key")
);

-- CreateIndex
CREATE UNIQUE INDEX "collection_orders_provider_reference_key" ON "collection_orders"("provider_reference");

-- CreateIndex
CREATE INDEX "collection_orders_status_created_at_idx" ON "collection_orders"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "collection_orders_merchant_id_idempotency_key_key" ON "collection_orders"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "collection_events_provider_external_event_id_key" ON "collection_events"("provider", "external_event_id");

-- AddForeignKey
ALTER TABLE "collection_events" ADD CONSTRAINT "collection_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "collection_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

