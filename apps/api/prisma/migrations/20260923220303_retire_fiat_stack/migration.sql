/*
  Warnings:

  - You are about to drop the `idempotency_keys` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payment_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `processing_attempts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `refunds` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `saved_cards` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "payment_events" DROP CONSTRAINT "payment_events_payment_id_fkey";

-- DropForeignKey
ALTER TABLE "processing_attempts" DROP CONSTRAINT "processing_attempts_event_id_fkey";

-- DropForeignKey
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_payment_id_fkey";

-- DropTable
DROP TABLE "idempotency_keys";

-- DropTable
DROP TABLE "payment_events";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "processing_attempts";

-- DropTable
DROP TABLE "refunds";

-- DropTable
DROP TABLE "saved_cards";

-- DropEnum
DROP TYPE "PaymentStatus";

-- DropEnum
DROP TYPE "Provider";
