import { Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReconcilerService } from '../reconciler/reconciler.service';

/**
 * Manual ops triggers. Exists because serverless platforms (Vercel) don't run
 * in-process cron — call this from an external scheduler (e.g. cron-job.org,
 * free) every few minutes, or by hand from the vault.
 */
@Controller('api/v1/ops')
export class OpsController {
  constructor(private readonly reconciler: ReconcilerService) {}

  @Post('reconcile')
  @HttpCode(202)
  async reconcile(@Headers('x-admin-token') adminToken: string, @Res({ passthrough: true }) res: Response) {
    const need = process.env.ADMIN_TOKEN ?? '';
    if (need && !need.includes('xxx') && adminToken !== need) {
      res.status(403);
      return { error: 'forbidden' };
    }
    await this.reconciler.reconcile();
    return { started: true };
  }
}
