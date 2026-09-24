'use client';

import { useState } from 'react';
import { createPayment, formatUsd } from '../lib/pay';

function loadPaystackInline(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) return resolve((window as any).PaystackPop);
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v1/inline.js';
    s.onload = () => resolve((window as any).PaystackPop);
    s.onerror = () => reject(new Error('Could not load the secure checkout. Check your connection and retry.'));
    document.head.appendChild(s);
  });
}

export default function Pay() {
  const [amount, setAmount] = useState('25.00');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    setError('');
    if (!email.includes('@')) return setError('Enter a valid email for the receipt.');
    const minor = Math.round(Number(amount) * 100);
    if (!Number.isFinite(minor) || minor <= 0) return setError('Enter a valid USD amount.');
    setBusy(true);
    try {
      const orderKey = `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      const order = await createPayment({
        orderKey,
        fiatAmountMinor: minor,
        email,
        callbackUrl: `${window.location.origin}/pay/PENDING_ID`,
      });
      localStorage.setItem(`payway:${order.id}`, JSON.stringify(order));

      const pubKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
      if (pubKey && order.provider === 'paystack') {
        // Embedded checkout: Paystack's card fields open in a secure window on
        // THIS page (no redirect, no Paystack page). Card details go straight
        // to Paystack inside their hosted frame — PayWay never sees them.
        const Pop = await loadPaystackInline();
        Pop.setup({
          key: pubKey,
          email,
          amount: minor,
          currency: 'USD',
          ref: order.providerReference,
          callback: () => {
            window.location.href = `/pay/${order.id}`;
          },
          onClose: () => {
            window.location.href = `/pay/${order.id}`;
          },
        }).openIframe();
      } else {
        // Fallback (failover provider or no public key configured): hosted page.
        window.location.href = order.authUrl;
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  const minor = Math.round(Number(amount) * 100) || 0;

  return (
    <div>
      <div className="card">
        <h1>Pay with card</h1>
        <p className="mut">No account. No verification. Just pay.</p>

        <div className="steps">
          <div className="step-row"><span className="n">1</span> Enter the amount and your email below.</div>
          <div className="step-row"><span className="n">2</span> A secure card window opens right here — enter your card details there.</div>
          <div className="step-row"><span className="n">3</span> Done. You get a receipt and a live payment tracker.</div>
        </div>

        <label>Email for receipt</label>
        <input placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label>Amount (USD)</label>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        {error && <p className="err">{error}</p>}
        <button className="btn" disabled={busy} onClick={pay}>
          {busy ? 'Opening secure checkout…' : `Pay ${formatUsd(minor)}`}
        </button>
        <p className="mut">Visa · Mastercard · Amex · Your card is charged in USD.</p>
      </div>
    </div>
  );
}
