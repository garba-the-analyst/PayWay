import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  live() {
    return { status: 'ok', service: 'payway-api' };
  }

  @Get('health/ready')
  ready() {
    return { ready: true, region: 'eu-west-1', providers: ['paystack'], mode: 'collections-to-usdt' };
  }
}
