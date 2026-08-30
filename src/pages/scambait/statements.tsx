import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { useCurrency, useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { Modal } from '../../components/ui/modal.tsx';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Date (newest first)' },
  { value: 'date_asc', label: 'Date (oldest first)' },
  { value: 'amount_desc', label: 'Amount (high to low)' },
  { value: 'amount_asc', label: 'Amount (low to high)' },
];

const RESULT_OPTIONS = [10, 25, 50, 'all'];

export default function StatementsPage() {
  usePageTitle('Bank statements');
  const format = useCurrency();
  const { settings } = useSettings();
  const { active } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState('date_desc');
  const [limit, setLimit] = useState<number | 'all'>(25);

  const [statements, setStatements] = useState<{ id: number; description: string; amount: number; date: Date }[]>([]);
  useEffect(() => {
    import('../../utils/fake_statements.js').then(({ generateStatements }) => {
      setStatements(generateStatements(450, active?.id ?? null));
    });
  }, [active?.id]);

  const sorted = useMemo(() => {
    const arr = [...statements];
    arr.sort((a, b) => {
      switch (sort) {
        case 'date_asc': return a.date.getTime() - b.date.getTime();
        case 'date_desc': return b.date.getTime() - a.date.getTime();
        case 'amount_asc': return a.amount - b.amount;
        case 'amount_desc': return b.amount - a.amount;
        default: return 0;
      }
    });
    return arr;
  }, [statements, sort]);

  const sliced = limit === 'all' ? sorted : sorted.slice(0, Number(limit));

  const totalDebits = statements.filter((s) => s.amount < 0).reduce((acc, s) => acc + s.amount, 0);
  const totalCredits = statements.filter((s) => s.amount > 0).reduce((acc, s) => acc + s.amount, 0);

  if (!settings.scambait) {
    return (
      <>
        <Modal open onClose={() => navigate(-1)} title="Enable scambait mode first" fullscreen>
          <div className="center">
            This page is a scambait mode-only page. <Link to="/settings/scambait">Would you like to enable it?</Link>
          </div>
        </Modal>
      </>
    );
  }

  return (
    <>
      <h1 className="mt-0">Bank statements</h1>

      <div className="grid cols-2 mb-2">
        <div className="card stat-card">
          <span className="stat-label">Total credits</span>
          <span className="stat-value" style={{ color: 'var(--success)' }}>+{format(totalCredits)}</span>
          <span className="stat-sub">since 2017</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Total debits</span>
          <span className="stat-value" style={{ color: 'var(--alert-error)' }}>{format(Math.abs(totalDebits))}</span>
          <span className="stat-sub">since 2017</span>
        </div>
      </div>

      <div className="card">
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
                <th>Date</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {sliced.map((s) => {
                const credit = s.amount > 0;
                return (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: '0.9rem' }}>
                      {DATE_FMT.format(s.date)}
                    </td>
                    <td>{s.description}</td>
                    <td style={{ textAlign: 'right', color: credit ? 'var(--success)' : 'var(--alert-error)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {credit ? '+' : '-'}{format(Math.abs(s.amount))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
