import { Injectable } from '@nestjs/common';
import { InitParams, InitResult } from './collection-provider.interface';
import { PaystackProvider } from './paystack.provider';

/** Single collector: Paystack. (Failover removed — add a second provider here if ever needed.) */
@Injectable()
export class CollectionsRouter {
  constructor(private readonly paystack: PaystackProvider) {}

  forProvider(_name: 'paystack') {
    return this.paystack;
  }

  async initialize(p: InitParams): Promise<InitResult> {
    return this.paystack.initialize(p);
  }
}
