import * as crypto from 'crypto';
import { verifyPaystackSignature } from './signature.util';

describe('collector webhook signatures', () => {
  it('verifies paystack HMAC-SHA512', () => {
    const secret = 'whsec_test';
    const raw = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const sig = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    expect(verifyPaystackSignature(raw, secret, sig)).toBe(true);
    expect(verifyPaystackSignature(raw, secret, 'deadbeef')).toBe(false);
  });
});
