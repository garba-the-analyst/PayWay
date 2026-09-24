import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, logger: ['log', 'warn', 'error'] });
  app.use(helmet());
  app.use(express.json({
    limit: '256kb',
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    },
  }));
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? true });
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`PayWay API listening on :${port} (eu-west-1 build)`, 'bootstrap');
}
void bootstrap();
