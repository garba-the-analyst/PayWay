import { NestFactory } from '@nestjs/core';
import serverless from '@vendia/serverless-express';
import * as express from 'express';
import { AppModule } from '../src/app.module';

let cached: any = null;

/** Vercel serverless entry: boots Nest once per warm container, serves all routes. */
export default async function handler(req: any, res: any) {
  if (!cached) {
    const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['error', 'warn'] });
    // Same raw-body capture as main.ts — webhook signature verification depends on it.
    app.use(
      express.json({
        limit: '256kb',
        verify: (r: any, _res, buf) => {
          r.rawBody = Buffer.from(buf);
        },
      }),
    );
    app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
    await app.init();
    cached = serverless({ app: app.getHttpAdapter().getInstance() });
  }
  return cached(req, res);
}
