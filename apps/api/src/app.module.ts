import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { CollectionsController } from './modules/collections/collections.controller';
import { CollectionsRouter } from './modules/collections/collections-router.service';
import { CollectionsService } from './modules/collections/collections.service';
import { CollectionsWebhookController } from './modules/collections/collections-webhook.controller';
import { PaystackProvider } from './modules/collections/paystack.provider';
import { RateService } from './modules/collections/rate.service';
import { HealthController } from './modules/health/health.controller';
import { ReconcilerService } from './modules/reconciler/reconciler.service';
import { IdempotencyStore } from './shared/idempotency.store';
import { PrismaService } from './shared/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [HealthController, CollectionsController, CollectionsWebhookController],
  providers: [
    PrismaService,
    IdempotencyStore,
    PaystackProvider,
    CollectionsRouter,
    CollectionsService,
    RateService,
    ReconcilerService,
  ],
})
export class AppModule {}
