import {
  canTransitionCollection,
  paystackEventToCollection,
} from './collection-state-machine';

describe('collection state machine', () => {
  it('walks the happy path and blocks regressions', () => {
    expect(canTransitionCollection('INITIATED', 'FIAT_AUTHORIZED')).toBe(true);
    expect(canTransitionCollection('FIAT_AUTHORIZED', 'CONVERTING')).toBe(true);
    expect(canTransitionCollection('CONVERTING', 'SETTLED_USDT')).toBe(true);
    expect(canTransitionCollection('SETTLED_USDT', 'FAILED')).toBe(false);
    expect(canTransitionCollection('FIAT_AUTHORIZED', 'REFUNDED')).toBe(true);
    expect(canTransitionCollection('INITIATED', 'SETTLED_USDT')).toBe(false);
  });

  it('maps collector events', () => {
    expect(paystackEventToCollection('charge.success')).toBe('FIAT_AUTHORIZED');
    expect(paystackEventToCollection('charge.failed')).toBe('FAILED');
    expect(paystackEventToCollection('refund.processed')).toBe('REFUNDED');
    expect(paystackEventToCollection('transfer.success')).toBeNull();
  });
});
