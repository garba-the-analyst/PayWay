const API = () => (process.env.NEXT_PUBLIC_PAYWAY_API || 'http://localhost:3000').replace(/\/$/, '');
const MERCHANT = () => process.env.NEXT_PUBLIC_MERCHANT_ID || 'demo_merchant';

export type CollectionOrder = {
  id: string;
  merchantId: string;
  orderId: string;
  provider: 'paystack';
  providerReference: string;
  authUrl: string;
  fiatAmountMinor: number;
  fiatCurrency: string;
  status: 'INITIATED' | 'FIAT_AUTHORIZED' | 'CONVERTING' | 'SETTLED_USDT' | 'FAILED' | 'REFUNDED';
  quotedUsdt: string | null;
  executedUsdt: string | null;
  txHash: string | null;
};

export function formatUsd(minor: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(minor / 100);
}

export async function createPayment(input: {
  orderKey: string;
  fiatAmountMinor: number;
  email: string;
  callbackUrl?: string;
}): Promise<CollectionOrder> {
  const res = await fetch(`${API()}/api/v1/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': MERCHANT(),
      'Idempotency-Key': input.orderKey,
    },
    body: JSON.stringify({
      orderId: input.orderKey,
      fiatAmountMinor: input.fiatAmountMinor,
      email: input.email,
      callbackUrl: input.callbackUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `pay failed: ${res.status}`);
  return data;
}

export async function getPayment(id: string): Promise<CollectionOrder> {
  const res = await fetch(`${API()}/api/v1/pay/${id}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`lookup failed: ${res.status}`);
  return res.json();
}

export async function listPayments(limit = 50): Promise<CollectionOrder[]> {
  const headers: Record<string, string> = { 'X-Merchant-Id': MERCHANT() };
  const token = process.env.NEXT_PUBLIC_ADMIN_TOKEN;
  if (token) headers['X-Admin-Token'] = token;
  const res = await fetch(`${API()}/api/v1/pay?limit=${limit}`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return res.json();
}
