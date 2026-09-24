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

/** Flutterwave: `ver-hash` header equals the webhook secret (fallback: HMAC-SHA256). */
export function verifyFlutterwaveSignature(rawBody: Buffer, secret: string, verHash: string | undefined): boolean {
  if (!verHash || !secret) return false;
  try {
    if (crypto.timingSafeEqual(Buffer.from(String(verHash)), Buffer.from(secret))) return true;
  } catch {
    /* fall through */
  }
  const digest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(String(verHash)));
  } catch {
    return false;
  }
}
