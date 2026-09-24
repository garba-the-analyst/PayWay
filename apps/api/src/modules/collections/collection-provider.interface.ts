import { Injectable, Logger } from '@nestjs/common';

export interface InitParams {
  paymentId: string;
  amountMinor: number;
  currency: string;
  email?: string;
  callbackUrl?: string;
}

export interface InitResult {
  provider: 'paystack' | 'flutterwave';
  providerReference: string;
  authUrl: string;
}

export interface CollectionProvider {
  readonly name: 'paystack' | 'flutterwave';
  initialize(p: InitParams): Promise<InitResult>;
  verify(reference: string): Promise<{ status: 'SUCCEEDED' | 'FAILED' | 'PROCESSING' }>;
}
