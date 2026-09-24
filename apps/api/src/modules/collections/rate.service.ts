import { Injectable, Logger } from '@nestjs/common';

export interface UsdtQuote {
  /** USDT per 1 unit of fiat (e.g. per USD). */
  rate: number;
  source: string;
  quotedAt: string;
}

/**
 * USDT conversion rate. Live: CoinGecko tether price. Stub (RATE_SOURCE_STUB=true
 * or fetch failure in non-production): 1.0 — for local dev and unit tests only.
 * Execution (actual USDT purchase/transfer) is an ops/exchange step, not here.
 */
@Injectable()
export class RateService {
  private readonly log = new Logger(RateService.name);

  async quoteUsdt(fiatCurrency: string): Promise<UsdtQuote> {
    if (fiatCurrency !== 'USD') throw new Error('v1 converts USD only');
    if (process.env.RATE_SOURCE_STUB === 'true') {
      return { rate: 1, source: 'stub', quotedAt: new Date().toISOString() };
    }
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd',
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) throw new Error(`coingecko: ${res.status}`);
      const json: any = await res.json();
      const price = Number(json?.tether?.usd);
      if (!Number.isFinite(price) || price <= 0) throw new Error('bad coingecko payload');
      return { rate: 1 / price, source: 'coingecko', quotedAt: new Date().toISOString() };
    } catch (err) {
      this.log.warn(`rate fetch failed: ${(err as Error).message}`);
      if (process.env.NODE_ENV === 'production') throw err;
      return { rate: 1, source: 'stub-fallback', quotedAt: new Date().toISOString() };
    }
  }

  usdtForFiat(fiatMajor: number, rate: number): string {
    return (fiatMajor * rate).toFixed(6).replace(/\.?0+$/, '');
  }
}
