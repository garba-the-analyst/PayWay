import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().default('postgresql://payway:payway_dev@localhost:5432/payway'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  PORT: z.coerce.number().default(3000),
  PAYSTACK_SECRET_KEY: z.string().default('sk_test_xxx'),
  PAYSTACK_WEBHOOK_SECRET: z.string().default('whsec_paystack_xxx'),
  FLUTTERWAVE_SECRET_KEY: z.string().default('FLWSECK_TEST_xxx'),
  FLUTTERWAVE_WEBHOOK_SECRET: z.string().default('flw_wh_xxx'),
  DEFAULT_CURRENCY: z.string().default('USD'),
  RATE_SOURCE_STUB: z.string().default(''),
  // Our USDT receiving wallet (TRON) — displayed to ops; spending happens in treasury.
  SETTLEMENT_WALLET_USDT: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
