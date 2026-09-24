import { Injectable, Logger } from '@nestjs/common';
import { FlutterwaveProvider } from './flutterwave.provider';
import { InitParams, InitResult } from './collection-provider.interface';
import { PaystackProvider } from './paystack.provider';

/** Paystack primary, Flutterwave on failure. */
@Injectable()
export class CollectionsRouter {
  private readonly log = new Logger(CollectionsRouter.name);

  constructor(
    private readonly paystack: PaystackProvider,
    private readonly flutterwave: FlutterwaveProvider,
  ) {}

  forProvider(name: 'paystack' | 'flutterwave') {
    return name === 'flutterwave' ? this.flutterwave : this.paystack;
  }

  async initialize(p: InitParams): Promise<InitResult> {
    try {
      return await this.paystack.initialize(p);
    } catch (err) {
      this.log.warn(`Paystack init failed, failing over to Flutterwave: ${(err as Error).message}`);
      return this.flutterwave.initialize(p);
    }
  }
}
