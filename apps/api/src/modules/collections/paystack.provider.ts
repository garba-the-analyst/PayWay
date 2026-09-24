import { Injectable, Logger } from '@nestjs/common';
import { CollectionProvider, InitParams, InitResult } from './collection-provider.interface';

const BASE = 'https://api.paystack.co';

/**
 * Paystack (primary collector). We are the merchant — one KYB on our side,
 * payers just check out, no accounts or KYC. PANs stay in Paystack's UI.
 */
@Injectable()
export class PaystackProvider implements CollectionProvider {
  readonly name = 'paystack' as const;
  private readonly log = new Logger(PaystackProvider.name);

  private get key() {
    return process.env.PAYSTACK_SECRET_KEY ?? '';
  }

  async initialize(p: InitParams): Promise<InitResult> {
    const reference = `pw_${p.paymentId.replace(/-/g, '').slice(0, 24)}`;
    if (!this.key || this.key.includes('xxx')) {
      this.log.warn('PAYSTACK_SECRET_KEY missing; returning stub init result');
      return { provider: 'paystack', providerReference: reference, authUrl: `https://checkout.paystack.com/${reference}` };
    }
    const res = await fetch(`${BASE}/transaction/initialize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: p.amountMinor,
        email: p.email ?? 'customer@payway.local',
        currency: p.currency,
        reference,
        callback_url: p.callbackUrl,
      }),
    });
    if (!res.ok) throw new Error(`paystack initialize failed: ${res.status}`);
    const json: any = await res.json();
    return {
      provider: 'paystack',
      providerReference: json.data.reference,
      authUrl: json.data.authorization_url,
    };
  }

  async verify(reference: string) {
    if (!this.key || this.key.includes('xxx')) return { status: 'PROCESSING' as const };
    const res = await fetch(`${BASE}/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${this.key}` },
    });
    if (!res.ok) throw new Error(`paystack verify failed: ${res.status}`);
    const json: any = await res.json();
    const s = String(json.data?.status ?? '').toLowerCase();
    return {
      status: s === 'success' ? ('SUCCEEDED' as const) : s === 'failed' ? ('FAILED' as const) : ('PROCESSING' as const),
    };
  }
}
