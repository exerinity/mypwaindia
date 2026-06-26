import { useMemo, useState } from 'react';

export interface Transaction {
  id: number;
  transaction_id: string;
  amount: number;
  status: string;
  created: string;
  sender?: { id: number; username: string };
  recipient?: { id: number; username: string };
  note?: string;
}
import { Link, useLocation } from 'react-router-dom';
import { useCurrency } from '../context/settings_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';

const RESULT_OPTIONS = [10, 25, 50, 100, 'all'];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc',  label: 'Date (oldest first)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc',  label: 'Amount (low to high)' },
  { value: 'sender_az',   label: 'Sender (A-Z)' },
  { value: 'sender_za',   label: 'Sender (Z-A)' },
  { value: 'recipient_az','label': 'Recipient (A-Z)' },
  { value: 'recipient_za','label': 'Recipient (Z-A)' },
];

interface TransactionTableProps { transactions: Transaction[]; currentUserId?: number; hideLimitControl?: boolean }
type SortCol = 'date' | 'amount' | 'sender' | 'recipient';
const COL_SORTS: Record<SortCol, [string, string]> = {
  date:      ['date_desc', 'date_asc'],
  amount:    ['amount_desc', 'amount_asc'],
  sender:    ['sender_az',  'sender_za'],
  recipient: ['recipient_az', 'recipient_za'],
};

export function TransactionTable({ transactions, currentUserId, hideLimitControl }: TransactionTableProps) {
  const format = useCurrency();
  const location = useLocation();
  const [sort, setSort] = useState('date_desc');
  const [limit, setLimit] = useState<number | 'all'>(25);
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';

  function toggleCol(col: SortCol) {
    const [asc, desc] = COL_SORTS[col];
    setSort(prev => prev === asc ? desc : asc);
  }

  function colIndicator(col: SortCol) {
    const [first, second] = COL_SORTS[col];
    if (sort === first) return ' ↓';
    if (sort === second) return ' ↑';
    return ' ↕';
  }

  const sorted = useMemo(() => {
    const arr = [...(transactions || [])];
    arr.sort((a, b) => {
      switch (sort) {
        case 'date_asc':      return new Date(a.created).getTime() - new Date(b.created).getTime();
        case 'date_desc':     return new Date(b.created).getTime() - new Date(a.created).getTime();
        case 'amount_asc':    return a.amount - b.amount;
        case 'amount_desc':   return b.amount - a.amount;
        case 'sender_az':     return (a.sender?.username || '').localeCompare(b.sender?.username || '');
        case 'sender_za':     return (b.sender?.username || '').localeCompare(a.sender?.username || '');
        case 'recipient_az':  return (a.recipient?.username || '').localeCompare(b.recipient?.username || '');
        case 'recipient_za':  return (b.recipient?.username || '').localeCompare(a.recipient?.username || '');
        default: return 0;
      }
    });
    return arr;
  }, [transactions, sort]);

  const sliced = limit === 'all' ? sorted : sorted.slice(0, Number(limit));

  if (!transactions || !transactions.length) {
    return <div className="empty">Nothing yet</div>;
  }

  return (
    <>
      <div className="table-controls">
        {!hideLimitControl && (
          <label>
            Show up to
            <select value={limit} onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              {RESULT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n === 'all' ? 'All' : `${n}`}</option>
              ))}
            </select>
            entries
          </label>
        )}
        <label>
          Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <span className="muted" style={{ marginLeft: 'auto' }}>
          {sliced.length} of {sorted.length}
        </span>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Transaction</th>
              <th onClick={() => toggleCol('sender')} style={{ cursor: 'pointer' }}>From{colIndicator('sender')}</th>
              <th onClick={() => toggleCol('recipient')} style={{ cursor: 'pointer' }}>To{colIndicator('recipient')}</th>
              <th onClick={() => toggleCol('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Amount{colIndicator('amount')}</th>
              <th onClick={() => toggleCol('date')} style={{ cursor: 'pointer' }}>When{colIndicator('date')}</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sliced.map((tx) => {
              const outgoing = currentUserId != null && tx.sender?.id === currentUserId;
              return (
                <tr key={tx.id}>
                  <td>
                    <Link to={`/i/flow/transaction/${tx.transaction_id}`} state={{ backgroundLocation: location }} className="mono">
                      {tx.transaction_id}
                    </Link>
                  </td>
                  <td>{tx.sender?.username || '-'}</td>
                  <td>{tx.recipient?.username || '-'}</td>
                  <td style={{ textAlign: 'right', color: outgoing ? 'var(--alert-error)' : 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>
                    {outgoing ? '-' : '+'}{format(tx.amount)}
                  </td>
                  <td>{formatDate(tx.created)}</td>
                  <td>
                    <span className={`link-status ${tx.status}`}>{tx.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}