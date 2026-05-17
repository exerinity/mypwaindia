import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCurrency } from '../context/SettingsContext.jsx';
import { formatDate } from '../utils/dates.js';

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

export function TransactionTable({ transactions, currentUserId }) {
  const format = useCurrency();
  const [sort, setSort] = useState('date_desc');
  const [limit, setLimit] = useState(25);

  const sorted = useMemo(() => {
    const arr = [...(transactions || [])];
    arr.sort((a, b) => {
      switch (sort) {
        case 'date_asc':      return new Date(a.created) - new Date(b.created);
        case 'date_desc':     return new Date(b.created) - new Date(a.created);
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
        <label>
          Show
          <select value={limit} onChange={(e) => setLimit(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
            {RESULT_OPTIONS.map((n) => (
              <option key={n} value={n}>{n === 'all' ? 'All' : `${n}`}</option>
            ))}
          </select>
          results
        </label>
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
              <th>From</th>
              <th>To</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>When</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sliced.map((tx) => {
              const outgoing = currentUserId != null && tx.sender?.id === currentUserId;
              return (
                <tr key={tx.id}>
                  <td>
                    <Link to={`/i/transaction/${tx.transaction_id}`} className="mono">
                      {tx.transaction_id}
                    </Link>
                  </td>
                  <td>{tx.sender?.username || '—'}</td>
                  <td>{tx.recipient?.username || '—'}</td>
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