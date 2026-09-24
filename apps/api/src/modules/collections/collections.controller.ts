import { Body, Controller, Get, Headers, HttpCode, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CollectionsService } from './collections.service';

function adminOk(adminToken: string | undefined): boolean {
  const need = process.env.ADMIN_TOKEN ?? '';
  if (!need || need.includes('xxx')) return true; // dev default: open
  return adminToken === need;
}

@Controller('api/v1/pay')
export class CollectionsController {
  constructor(private readonly collections: CollectionsService) {}

  /** Create a payment order: payer gets a hosted checkout URL. No accounts, no KYC. */
  @Post()
  async create(
    @Headers('idempotency-key') idemKey: string,
    @Headers('x-merchant-id') merchantId: string,
    @Body() body: { orderId?: string; fiatAmountMinor: number; email?: string; callbackUrl?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!idemKey) {
      res.status(400);
      return { error: 'Idempotency-Key header is required' };
    }
    try {
      const { replayed, order } = await this.collections.create(
        {
          merchantId: merchantId || 'default_merchant',
          orderId: body.orderId ?? `ord_${Date.now().toString(36)}`,
          fiatAmountMinor: body.fiatAmountMinor,
          fiatCurrency: 'USD',
          email: body.email,
          callbackUrl: body.callbackUrl,
        },
        idemKey,
      );
      res.status(replayed ? 200 : 201);
      return order;
    } catch (err) {
      res.status(400);
      return { error: (err as Error).message };
    }
  }

  @Get()
  @HttpCode(200)
  list(
    @Headers('x-merchant-id') merchantId: string,
    @Headers('x-admin-token') adminToken: string,
    @Query('limit') limit: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!adminOk(adminToken)) {
      res.status(403);
      return { error: 'forbidden' };
    }
    return this.collections.listByMerchant(merchantId || 'default_merchant', Number(limit) || 50);
  }

  @Get(':id')
  @HttpCode(200)
  getOne(@Param('id') id: string) {
    return this.collections.getById(id);
  }

  /** Ops settlement: record executed USDT + chain tx hash after conversion. */
  @Post(':id/settle')
  async settle(
    @Param('id') id: string,
    @Headers('x-admin-token') adminToken: string,
    @Body() body: { txHash: string; executedUsdt?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!adminOk(adminToken)) {
      res.status(403);
      return { error: 'forbidden' };
    }
    try {
      return await this.collections.markSettled(id, {
        txHash: body.txHash,
        executedUsdt: body.executedUsdt ?? '',
      });
    } catch (err) {
      res.status(400);
      return { error: (err as Error).message };
    }
  }
}
