-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('paystack', 'flutterwave');

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" "Provider" NOT NULL DEFAULT 'paystack',
    "provider_reference" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "email" TEXT,
    "last4" TEXT,
    "auth_url" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT,
    "provider" "Provider" NOT NULL,
    "external_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_attempts" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "attempt_no" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "resp_code" INTEGER NOT NULL,
    "resp_body" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("merchant_id","key")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount_minor" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider_ref" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" TEXT NOT NULL,
    "merchant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL DEFAULT '',
    "provider" "Provider" NOT NULL DEFAULT 'paystack',
    "brand" TEXT NOT NULL DEFAULT 'card',
    "last4" TEXT NOT NULL,
    "exp_month" TEXT NOT NULL DEFAULT '',
    "exp_year" TEXT NOT NULL DEFAULT '',
    "auth_code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_reference_key" ON "payments"("provider_reference");

-- CreateIndex
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payments_merchant_id_idempotency_key_key" ON "payments"("merchant_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_provider_external_event_id_key" ON "payment_events"("provider", "external_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_provider_ref_key" ON "refunds"("provider_ref");

-- CreateIndex
CREATE INDEX "saved_cards_merchant_id_idx" ON "saved_cards"("merchant_id");

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_attempts" ADD CONSTRAINT "processing_attempts_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "payment_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
