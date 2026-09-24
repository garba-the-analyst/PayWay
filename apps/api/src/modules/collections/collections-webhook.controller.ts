import { Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/prisma.service';
import { flutterwaveEventToCollection, paystackEventToCollection } from './collection-state-machine';
import { CollectionsService } from './collections.service';
import { verifyFlutterwaveSignature, verifyPaystackSignature } from './signature.util';

/**
 * Card-collector webhooks. Fiat capture → FIAT_AUTHORIZED → rate locked →
 * CONVERTING (USDT obligation recorded; settlement follows via ops/exchange).
 */
@Controller('webhooks')
export class CollectionsWebhookController {
  constructor(
    private readonly db: PrismaService,
    private readonly collections: CollectionsService,
  ) {}

  @Post('paystack')
  @HttpCode(200)
  async paystack(@Req() req: Request, @Headers('x-paystack-signature') sig: string) {
    const raw = (req as any).rawBody as Buffer;
    // Paystack signs with the SECRET key (no separate webhook secret exists).
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY || '';
    if (!verifyPaystackSignature(raw, secret, sig)) {
      throw new UnauthorizedException('invalid paystack signature');
    }
    return this.handle('paystack', JSON.parse(raw.toString()));
  }

  @Post('flutterwave')
  @HttpCode(200)
  async flutterwave(@Req() req: Request, @Headers('ver-hash') verHash: string) {
    const raw = (req as any).rawBody as Buffer;
    if (!verifyFlutterwaveSignature(raw, process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? '', verHash)) {
      throw new UnauthorizedException('invalid flutterwave signature');
    }
    return this.handle('flutterwave', JSON.parse(raw.toString()));
  }

  private async handle(provider: 'paystack' | 'flutterwave', evt: any) {
    const type: string = evt?.event ?? evt?.type ?? evt?.eventType ?? 'unknown';
    const ref: string | undefined = evt?.data?.reference ?? evt?.data?.tx_ref ?? evt?.data?.txRef;
    const eventId: string = evt?.data?.id ? String(evt.data.id) : `${type}.${ref ?? 'noref'}`;
    if (!ref) return { received: true, ignored: 'no reference' };

    const next =
      provider === 'paystack'
        ? paystackEventToCollection(type)
        : flutterwaveEventToCollection(type, String(evt?.data?.status ?? ''));
    try {
      await this.db.collectionEvent.create({
        data: { provider, externalEventId: `${provider}:${eventId}`, type, raw: evt as Prisma.InputJsonValue },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { received: true, deduped: true };
      }
      throw e;
    }

    const order = await this.collections.findByProviderReference(ref);
    if (!order) return { received: true, unmatched: true };
    if (!next) return { received: true, ignored: 'unmapped event' };

    const applied = await this.collections.applyTransition(order.id, next);
    // Captured fiat immediately becomes a USDT obligation at the locked rate.
    let converting = false;
    if (applied && next === 'FIAT_AUTHORIZED') {
      try {
        await this.collections.lockRateAndConvert(order.id);
        converting = true;
      } catch (err) {
        // Rate source down: stays FIAT_AUTHORIZED; reconciler retries.
        return { received: true, applied, converting: false, rateError: (err as Error).message };
      }
    }
    return { received: true, applied, converting };
  }
}
