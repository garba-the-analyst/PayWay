import { Injectable, Logger } from '@nestjs/common';

export interface InitParams {
  paymentId: string;
  amountMinor: number;
  currency: string;
  email?: string;
  callbackUrl?: string;
}

export interface InitResult {
  provider: 'paystack';
  providerReference: string;
  authUrl: string;
}

export interface CollectionProvider {
  readonly name: 'paystack';
  initialize(p: InitParams): Promise<InitResult>;
  verify(reference: string): Promise<{ status: 'SUCCEEDED' | 'FAILED' | 'PROCESSING' }>;
}
