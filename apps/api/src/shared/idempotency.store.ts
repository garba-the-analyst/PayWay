import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

type StoredResponse = { statusCode: number; body: unknown };

/**
 * Idempotency store: Redis in production, in-memory fallback for local/test.
 * DB table `idempotency_keys` is authoritative; this class is the fast path.
 */
@Injectable()
export class IdempotencyStore implements OnModuleInit, OnModuleDestroy {
  private mem = new Map<string, { value: StoredResponse; expiresAt: number }>();
  private redis: any = null;

  async onModuleInit() {
    try {
      const url = process.env.REDIS_URL;
      if (!url) return;
      // Lazy import so unit tests don't require ioredis connection.
      const { default: IORedis } = await import('ioredis');
      const client = new IORedis(url, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      client.on('error', () => null); // Redis optional locally; production uses ElastiCache
      await client.ping().catch(() => null);
      if (client.status === 'ready' || client.status === 'connect') this.redis = client;
      else client.disconnect();
    } catch {
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    try {
      await this.redis?.quit();
    } catch {
      /* noop */
    }
  }

  private k(merchant: string, key: string) {
    return `idem:${merchant}:${key}`;
  }

  async get(merchant: string, key: string): Promise<StoredResponse | null> {
    if (this.redis) {
      const raw = await this.redis.get(this.k(merchant, key)).catch(() => null);
      if (raw) return JSON.parse(raw) as StoredResponse;
    }
    const hit = this.mem.get(this.k(merchant, key));
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.mem.delete(this.k(merchant, key));
      return null;
    }
    return hit.value;
  }

  async set(merchant: string, key: string, value: StoredResponse, ttlSec = 86400) {
    if (this.redis) {
      await this.redis.set(this.k(merchant, key), JSON.stringify(value), 'EX', ttlSec).catch(() => null);
    }
    this.mem.set(this.k(merchant, key), { value, expiresAt: Date.now() + ttlSec * 1000 });
  }
}
