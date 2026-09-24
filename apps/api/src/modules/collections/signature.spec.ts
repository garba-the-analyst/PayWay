import * as crypto from 'crypto';
import { verifyFlutterwaveSignature, verifyPaystackSignature } from './signature.util';

describe('collector webhook signatures', () => {
  it('verifies paystack HMAC-SHA512', () => {
    const secret = 'whsec_test';
    const raw = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const sig = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    expect(verifyPaystackSignature(raw, secret, sig)).toBe(true);
    expect(verifyPaystackSignature(raw, secret, 'deadbeef')).toBe(false);
  });

  it('verifies flutterwave ver-hash', () => {
    const secret = 'flw_wh_test';
    const raw = Buffer.from('{}');
    expect(verifyFlutterwaveSignature(raw, secret, secret)).toBe(true);
    expect(verifyFlutterwaveSignature(raw, secret, 'wrong')).toBe(false);
  });
});
