'use client';

import { useEffect, useState } from 'react';
import { formatUsd, getPayment, type CollectionOrder } from '../../../lib/pay';

const STEPS = [
  { key: 'FIAT_AUTHORIZED', label: 'Card charged' },
  { key: 'CONVERTING', label: 'Converting to USDT' },
  { key: 'SETTLED_USDT', label: 'Settled' },
] as const;

const FRIENDLY: Record<CollectionOrder['status'], string> = {
  INITIATED: 'Awaiting payment',
  FIAT_AUTHORIZED: 'Card charged',
  CONVERTING: 'Converting to USDT',
  SETTLED_USDT: 'Settled',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
};

export default function PayStatus({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<CollectionOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    const cached = localStorage.getItem(`payway:${params.id}`);
    if (cached) setOrder(JSON.parse(cached));
    getPayment(params.id)
      .then((o) => !stop && setOrder(o))
      .catch(() => {
        if (!cached) setError('Payment not found.');
      });
    const t = setInterval(async () => {
      try {
        const o = await getPayment(params.id);
        if (!stop) {
          setOrder(o);
          if (['SETTLED_USDT', 'FAILED', 'REFUNDED'].includes(o.status)) clearInterval(t);
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [params.id]);

  return (
    <div className="card">
      <h1>Payment status</h1>
      {error && <p className="err">{error}</p>}
      {!order && !error && <p className="mut">Loading…</p>}
      {order && (
        <>
          <div className="row">
            <span className={`pill ${order.status === 'SETTLED_USDT' ? 'ok' : order.status === 'FAILED' ? 'bad' : ''}`}>
              {FRIENDLY[order.status]}
            </span>
          </div>
          <h2>{formatUsd(order.fiatAmountMinor)}</h2>
          <div className="timeline">
            {STEPS.map((s) => (
              <span key={s.key} className={`step ${stage(order.status) >= stage(s.key) ? 'done' : ''}`}>
                {s.label}
              </span>
            ))}
          </div>
          {order.status === 'INITIATED' && order.authUrl && (
            <div className="row">
              <a className="btn" href={order.authUrl}>Complete payment</a>
              <span className="mut">If you closed the checkout, resume here.</span>
            </div>
          )}
          {(order.status === 'CONVERTING' || order.status === 'FIAT_AUTHORIZED') && order.quotedUsdt && (
            <p className="mut">≈ {order.quotedUsdt} USDT — converting…</p>
          )}
          {order.status === 'SETTLED_USDT' && (
            <p className="okbox">
              Settled{order.executedUsdt ? ` — ${order.executedUsdt} USDT` : ''}.
              {order.txHash && (
                <> <a href={`https://tronscan.org/#/transaction/${order.txHash}`} target="_blank" rel="noreferrer">View on-chain</a></>
              )}
            </p>
          )}
          {order.status === 'FAILED' && <p className="err">Payment failed. Start a new payment to retry.</p>}
        </>
      )}
    </div>
  );
}

function stage(s: CollectionOrder['status']): number {
  const order = ['INITIATED', 'FIAT_AUTHORIZED', 'CONVERTING', 'SETTLED_USDT'];
  return order.indexOf(s);
}
