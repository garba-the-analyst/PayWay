import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { IdempotencyStore } from '../../shared/idempotency.store';
import { PrismaService } from '../../shared/prisma.service';
import { canTransitionCollection, CollectionStatus } from './collection-state-machine';
import { CollectionsRouter } from './collections-router.service';
import { RateService } from './rate.service';

export interface CreateCollectionInput {
  merchantId: string;
  orderId: string;
  fiatAmountMinor: number;
  fiatCurrency: string;
  email?: string;
  callbackUrl?: string;
}

export interface CollectionRecord {
  id: string;
  merchantId: string;
  orderId: string;
  provider: 'paystack';
  providerReference: string;
  authUrl: string;
  fiatAmountMinor: number;
  fiatCurrency: string;
  status: CollectionStatus;
  quotedUsdt: string | null;
  executedUsdt: string | null;
  txHash: string | null;
}

type Row = {
  id: string;
  merchantId: string;
  orderId: string;
  provider: string;
  providerReference: string | null;
  authUrl: string | null;
  fiatAmountMinor: number;
  fiatCurrency: string;
  status: string;
  quotedUsdt: string | null;
  executedUsdt: string | null;
  txHash: string | null;
};

function toRecord(r: Row): CollectionRecord {
  return {
    id: r.id,
    merchantId: r.merchantId,
    orderId: r.orderId,
    provider: r.provider as 'paystack',
    providerReference: r.providerReference ?? '',
    authUrl: r.authUrl ?? '',
    fiatAmountMinor: r.fiatAmountMinor,
    fiatCurrency: r.fiatCurrency,
    status: r.status as CollectionStatus,
    quotedUsdt: r.quotedUsdt,
    executedUsdt: r.executedUsdt,
    txHash: r.txHash,
  };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

@Injectable()
export class CollectionsService {
  private readonly log = new Logger(CollectionsService.name);

  constructor(
    private readonly router: CollectionsRouter,
    private readonly idem: IdempotencyStore,
    private readonly db: PrismaService,
    private readonly rates: RateService,
  ) {}

  async create(input: CreateCollectionInput, idempotencyKey: string) {
    const cached = await this.idem.get(input.merchantId, idempotencyKey);
    if (cached && (cached.body as CollectionRecord)?.id) {
      return { replayed: true, order: cached.body as CollectionRecord };
    }
    const existing = await this.db.collectionOrder.findUnique({
      where: { merchantId_idempotencyKey: { merchantId: input.merchantId, idempotencyKey } },
    });
    if (existing) return { replayed: true, order: toRecord(existing) };

    if (!Number.isInteger(input.fiatAmountMinor) || input.fiatAmountMinor <= 0) {
      throw new Error('fiatAmountMinor must be a positive integer (minor units, e.g. cents)');
    }
    if ((input.fiatCurrency || 'USD').toUpperCase() !== 'USD') {
      throw new Error('v1 collects USD only');
    }

    const id = randomUUID();
    const init = await this.router.initialize({
      paymentId: id,
      amountMinor: input.fiatAmountMinor,
      currency: 'USD',
      email: input.email,
      callbackUrl: input.callbackUrl,
    });

    try {
      const row = await this.db.$transaction(async (tx) => {
        const order = await tx.collectionOrder.create({
          data: {
            id,
            merchantId: input.merchantId,
            orderId: input.orderId,
            provider: init.provider,
            providerReference: init.providerReference,
            authUrl: init.authUrl,
            fiatAmountMinor: input.fiatAmountMinor,
            fiatCurrency: 'USD',
            idempotencyKey,
          },
        });
        const record = toRecord(order);
        await tx.collectionIdempotency.create({
          data: {
            key: idempotencyKey,
            merchantId: input.merchantId,
            method: 'POST',
            path: '/api/v1/pay',
            respCode: 201,
            respBody: record as unknown as Prisma.InputJsonValue,
            expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
          },
        });
        return record;
      });
      await this.idem.set(input.merchantId, idempotencyKey, { statusCode: 201, body: row });
      return { replayed: false, order: row };
    } catch (e) {
      if (isUniqueViolation(e)) {
        const winner = await this.db.collectionOrder.findUnique({
          where: { merchantId_idempotencyKey: { merchantId: input.merchantId, idempotencyKey } },
        });
        if (winner) return { replayed: true, order: toRecord(winner) };
      }
      throw e;
    }
  }

  /**
   * Lock the USDT conversion rate after fiat capture and move to CONVERTING.
   * Retried safely: same-state re-entry is a no-op upstream.
   */
  async lockRateAndConvert(id: string): Promise<CollectionRecord | null> {
    const order = await this.db.collectionOrder.findUnique({ where: { id } });
    if (!order || order.status !== 'FIAT_AUTHORIZED') return order ? toRecord(order) : null;
    const quote = await this.rates.quoteUsdt(order.fiatCurrency);
    const quotedUsdt = this.rates.usdtForFiat(order.fiatAmountMinor / 100, quote.rate);
    const row = await this.db.collectionOrder.update({
      where: { id },
      data: { quotedUsdt, rateLockedAt: new Date(), status: 'CONVERTING' },
    });
    this.log.log(`order ${id}: locked ${quotedUsdt} USDT (${quote.source}) — awaiting settlement`);
    return toRecord(row);
  }

  /** Ops/exchange settlement: record executed USDT + chain tx hash. */
  async markSettled(id: string, s: { txHash: string; executedUsdt: string }): Promise<CollectionRecord> {
    const order = await this.db.collectionOrder.findUnique({ where: { id } });
    if (!order) throw new Error('order_not_found');
    if (!canTransitionCollection(order.status as CollectionStatus, 'SETTLED_USDT')) {
      throw new Error(`cannot settle from ${order.status}`);
    }
    if (!s.txHash) throw new Error('txHash is required');
    const row = await this.db.collectionOrder.update({
      where: { id },
      data: { status: 'SETTLED_USDT', txHash: s.txHash, executedUsdt: s.executedUsdt ?? order.quotedUsdt },
    });
    return toRecord(row);
  }

  async applyTransition(id: string, next: CollectionStatus): Promise<boolean> {
    const order = await this.db.collectionOrder.findUnique({ where: { id } });
    if (!order) return false;
    if (order.status === next) return false;
    if (!canTransitionCollection(order.status as CollectionStatus, next)) {
      this.log.warn(`Illegal collection transition ${order.status} -> ${next} for ${id}; dropping event`);
      return false;
    }
    await this.db.collectionOrder.update({ where: { id }, data: { status: next } });
    return true;
  }

  async findByProviderReference(ref: string) {
    const row = await this.db.collectionOrder.findUnique({ where: { providerReference: ref } });
    return row ? toRecord(row) : null;
  }

  async getById(id: string): Promise<CollectionRecord | null> {
    const row = await this.db.collectionOrder.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async listByMerchant(merchantId: string, limit = 50): Promise<CollectionRecord[]> {
    const rows = await this.db.collectionOrder.findMany({
      where: { merchantId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map(toRecord);
  }

  async listStuckFiat(olderThanMinutes = 10, limit = 100): Promise<CollectionRecord[]> {
    const rows = await this.db.collectionOrder.findMany({
      where: { status: { in: ['INITIATED', 'FIAT_AUTHORIZED'] }, createdAt: { lt: new Date(Date.now() - olderThanMinutes * 60 * 1000) } },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(toRecord);
  }

  async listStuckConverting(olderThanMinutes = 60, limit = 100): Promise<CollectionRecord[]> {
    const rows = await this.db.collectionOrder.findMany({
      where: { status: 'CONVERTING', updatedAt: { lt: new Date(Date.now() - olderThanMinutes * 60 * 1000) } },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
    return rows.map(toRecord);
  }
}
