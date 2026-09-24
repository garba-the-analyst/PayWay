import { Injectable, Logger } from '@nestjs/common';
import { CollectionProvider, InitParams, InitResult } from './collection-provider.interface';

const BASE = 'https://api.flutterwave.com/v3';

/** Flutterwave (failover collector). Same frictionless model: we are the merchant. */
@Injectable()
export class FlutterwaveProvider implements CollectionProvider {
  readonly name = 'flutterwave' as const;
  private readonly log = new Logger(FlutterwaveProvider.name);

  private get key() {
    return process.env.FLUTTERWAVE_SECRET_KEY ?? '';
  }

  async initialize(p: InitParams): Promise<InitResult> {
    const txRef = `pw_${p.paymentId.replace(/-/g, '').slice(0, 24)}`;
    if (!this.key || this.key.includes('xxx')) {
      this.log.warn('FLUTTERWAVE_SECRET_KEY missing; returning stub init result');
      return { provider: 'flutterwave', providerReference: txRef, authUrl: `https://checkout.flutterwave.com/${txRef}` };
    }
    const res = await fetch(`${BASE}/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: p.amountMinor / 100,
        currency: p.currency,
        redirect_url: p.callbackUrl,
        customer: { email: p.email ?? 'customer@payway.local' },
      }),
    });
    if (!res.ok) throw new Error(`flutterwave initialize failed: ${res.status}`);
    const json: any = await res.json();
    return { provider: 'flutterwave', providerReference: txRef, authUrl: json.data?.link ?? '' };
  }

  async verify(reference: string) {
    if (!this.key || this.key.includes('xxx')) return { status: 'PROCESSING' as const };
    const res = await fetch(`${BASE}/transactions/verify_by_reference?tx_ref=${reference}`, {
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) throw new Error(`flutterwave verify failed: ${res.status}`);
    const json: any = await res.json();
    const s = String(json.data?.status ?? '').toLowerCase();
    return {
      status: s === 'successful' ? ('SUCCEEDED' as const) : s === 'failed' ? ('FAILED' as const) : ('PROCESSING' as const),
    };
  }
}
