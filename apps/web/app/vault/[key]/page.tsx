'use client';

import { notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatUsd, listPayments, type CollectionOrder } from '../../../lib/pay';

/**
 * Ops console. Unlinked everywhere — reachable only at /vault/<ADMIN_SLUG>
 * with NEXT_PUBLIC_ADMIN_SLUG set, plus the admin token header when the API
 * has ADMIN_TOKEN configured.
 */
export default function Vault({ params }: { params: { key: string } }) {
  const [rows, setRows] = useState<CollectionOrder[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.key !== (process.env.NEXT_PUBLIC_ADMIN_SLUG || '')) return;
    listPayments()
      .then(setRows)
      .catch((e) => setError((e as Error).message));
  }, [params.key]);

  if (params.key !== (process.env.NEXT_PUBLIC_ADMIN_SLUG || '')) notFound();

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1>Collections — ops view</h1>
        <button
          className="btn ghost"
          onClick={() => listPayments().then(setRows).catch((e) => setError((e as Error).message))}
        >
          Refresh
        </button>
      </div>
      <p className="mut">Merchant-scoped. Production reads Postgres.</p>
      {error && <p className="err">{error}</p>}
      <table>
        <thead><tr><th>Fiat</th><th>Status</th><th>Provider</th><th>USDT</th><th>Tx</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><a href={`/pay/${r.id}`}>{formatUsd(r.fiatAmountMinor)}</a></td>
              <td>{r.status.replace(/_/g, ' ')}</td>
              <td>{r.provider}</td>
              <td className="mut">{r.executedUsdt ?? r.quotedUsdt ?? '—'}</td>
              <td className="mut">{r.txHash ? `${r.txHash.slice(0, 10)}…` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="mut">No collections yet — make one from the pay page.</p>}
    </div>
  );
}
