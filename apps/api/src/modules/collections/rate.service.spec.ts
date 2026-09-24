import { RateService } from './rate.service';

describe('rate service', () => {
  it('returns stub rate when RATE_SOURCE_STUB=true', async () => {
    process.env.RATE_SOURCE_STUB = 'true';
    const svc = new RateService();
    const q = await svc.quoteUsdt('USD');
    expect(q.rate).toBe(1);
    expect(svc.usdtForFiat(100, 0.98)).toBe('98');
    delete process.env.RATE_SOURCE_STUB;
  });

  it('rejects non-USD', async () => {
    process.env.RATE_SOURCE_STUB = 'true';
    await expect(new RateService().quoteUsdt('NGN')).rejects.toThrow(/USD only/);
    delete process.env.RATE_SOURCE_STUB;
  });
});
