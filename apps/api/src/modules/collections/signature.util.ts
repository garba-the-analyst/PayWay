import * as crypto from 'crypto';

/** Paystack: HMAC-SHA512 of the raw body, header `x-paystack-signature`. */
export function verifyPaystackSignature(rawBody: Buffer, secret: string, header: string | undefined): boolean {
  if (!header || !secret) return false;
  const digest = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(header));
  } catch {
    return false;
  }
}
