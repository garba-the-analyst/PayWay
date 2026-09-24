import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Custom Postgres connection (self-hosted Postgres / Render / RDS — never a BaaS).
 * Fail-fast on boot: without the database, payments cannot be served safely.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.log.log('connected to Postgres');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
