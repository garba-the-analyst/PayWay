import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { CollectionsRouter } from '../collections/collections-router.service';
import { CollectionsService } from '../collections/collections.service';

/**
 * Collections safety net (every 2 min):
 * - Stuck INITIATED/FIAT_AUTHORIZED (>10m): re-verify with the collector;
 *   missed captures get authorized and immediately converted.
 * - Stuck CONVERTING (>60m): flagged for ops (conversion needs exchange/treasury action).
 */
@Injectable()
export class ReconcilerService {
  private readonly log = new Logger(ReconcilerService.name);

  constructor(
    private readonly collections: CollectionsService,
    private readonly router: CollectionsRouter,
  ) {}

  @Cron('*/2 * * * *')
  async reconcile() {
    const stuck = await this.collections.listStuckFiat(10, 100);
    for (const o of stuck) {
      try {
        const v = await this.router.forProvider(o.provider).verify(o.providerReference);
        if (v.status === 'SUCCEEDED') {
          const applied = await this.collections.applyTransition(o.id, 'FIAT_AUTHORIZED');
          if (applied) {
            try {
              await this.collections.lockRateAndConvert(o.id);
            } catch (rateErr) {
              this.log.warn(`rate lock failed for ${o.id}: ${(rateErr as Error).message}`);
            }
          }
        } else if (v.status === 'FAILED') {
          await this.collections.applyTransition(o.id, 'FAILED');
        }
      } catch (err) {
        this.log.warn(`reconcile failed for ${o.id}: ${(err as Error).message}`);
      }
    }
    if (stuck.length > 0) this.log.log(`reconciled ${stuck.length} stuck collection(s)`);

    const converting = await this.collections.listStuckConverting(60, 100);
    for (const o of converting) {
      this.log.warn(`CONVERTING >60m needs ops action: ${o.id} (${o.quotedUsdt ?? '?'} USDT)`);
    }
  }
}
