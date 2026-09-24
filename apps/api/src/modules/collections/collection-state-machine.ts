export type CollectionStatus =
  | 'INITIATED'
  | 'FIAT_AUTHORIZED'
  | 'CONVERTING'
  | 'SETTLED_USDT'
  | 'FAILED'
  | 'REFUNDED';

const ALLOWED: Record<CollectionStatus, CollectionStatus[]> = {
  INITIATED: ['FIAT_AUTHORIZED', 'FAILED'],
  FIAT_AUTHORIZED: ['CONVERTING', 'FAILED', 'REFUNDED'],
  CONVERTING: ['SETTLED_USDT', 'FAILED', 'REFUNDED'],
  SETTLED_USDT: [],
  FAILED: [],
  REFUNDED: [],
};

export function canTransitionCollection(from: CollectionStatus, to: CollectionStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

/** Paystack charge events → lifecycle. */
export function paystackEventToCollection(type: string): CollectionStatus | null {
  const t = type.toLowerCase();
  if (t === 'charge.success') return 'FIAT_AUTHORIZED';
  if (t === 'charge.failed') return 'FAILED';
  if (t.includes('refund')) return 'REFUNDED';
  return null;
}

/** Flutterwave charge events → lifecycle. */
export function flutterwaveEventToCollection(type: string, status: string): CollectionStatus | null {
  const t = `${type}.${status}`.toLowerCase();
  if (t.includes('successful') || t.includes('success')) return 'FIAT_AUTHORIZED';
  if (t.includes('failed') || t.includes('cancelled')) return 'FAILED';
  return null;
}
