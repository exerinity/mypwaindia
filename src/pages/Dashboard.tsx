import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useSettings, useCurrency } from '../context/SettingsContext.jsx';
import { getUserInfo, getRestrictions } from '../api/user.js';
import { listTransactions } from '../api/transactions.js';
import { listLinks } from '../api/links.js';
import { getDisplayName } from '../utils/display.js';
import { LoadingRow, ErrorBox } from '../components/Status.jsx';
import { TransactionTable } from '../components/TransactionTable.jsx';
import { getRestrictionInfo } from '../utils/restrictions.js';
import { generateStatements } from '../utils/fakeStatements.js';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { active, updateAccountInfo } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  const scambait = settings.scambait;
  const refresh = settings.autoRefresh;

  const userQ = useApiCall(async () => {
    const info = await getUserInfo(active);
    updateAccountInfo(active.id, { lastBalance: info.balance, firstName: info.first_name, lastName: info.last_name });
    return info;
  }, [active?.token], { refresh });

  const restrictionsQ = useApiCall(
    () => getRestrictions(active),
    [active?.token],
    { refresh }
  );

  const txQ = useApiCall(
    () => listTransactions(active),
    [active?.token],
    { refresh }
  );

  const linksQ = useApiCall(
    () => listLinks(active),
    [active?.token],
    { refresh }
  );

  const fakeStatements = useMemo(() => scambait ? generateStatements(1000, active?.id).slice(0, 10) : [], [scambait, active?.id]);

  const transactions = txQ.data?.transactions || [];
  const links = linksQ.data?.links || [];
  const activeLinks = links.filter((l) => l.status === 'active');
  const restrictions = restrictionsQ.data?.restrictions || {};
  const restrictionList = Object.entries(restrictions).filter(([, v]) => v?.active);

  return (
    <>
      <h1 className="mt-0">Welcome back, {getDisplayName(active, settings.displayName)}!</h1>

      {restrictionList.length > 0 && (
        <div className="alert alert-warning">
          <strong>Your account has some active restrictions:</strong>{' '}
          {restrictionList.map(([k]) => getRestrictionInfo(k).title).join(', ')}.
          {' '}<Link to="/dash/account" className="muted">More...</Link>
        </div>
      )}

      <div className="grid cols-3 mb-2">
        <div className="card stat-card">
          <span className="stat-label">Balance</span>
          <span className="stat-value">
            {format(userQ.data?.balance ?? active?.lastBalance ?? 0)}
          </span>
          <span className="stat-sub">{getDisplayName(active, settings.displayName)}</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">
            {scambait ? 150 + ((Number(active?.id) * 31 + 127) % 850) : transactions.length}
          </span>
          <span className="stat-sub">{scambait ? 'since 2017' : 'all-time movement'}</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">{scambait ? 'Pending' : 'Active links'}</span>
          <span className="stat-value">
            {scambait ? (Number(active?.id) * 13 + 3) % 6 : activeLinks.length}
          </span>
          <span className="stat-sub">{scambait ? 'awaiting clearance' : `${links.length} total created`}</span>
        </div>
      </div>

      <div className="btn-row mb-2">
        <Link to="/dash/account/transfer" className="btn secondary">Transfer funds</Link>
        {!scambait && <Link to="/dash/links" className="btn secondary">Create a payment link</Link>}
        {!scambait && <Link to="/dash/links/claim" className="btn secondary">Claim a payment link</Link>}
        {scambait
          ? <Link to="/dash/statements" className="btn ghost">Full statements</Link>
          : <Link to="/dash/account/history" className="btn ghost">Full transaction history</Link>
        }
      </div>

      <div className="card">
        <div className="row spread mb-2">
          <h3 style={{ margin: 0 }}>Recent activity</h3>
          {scambait
            ? <Link to="/dash/statements" className="muted">View all</Link>
            : <Link to="/dash/account/history" className="muted">View all</Link>
          }
        </div>
        {scambait ? (
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
                {fakeStatements.map((s) => {
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
        ) : (
          txQ.loading && !txQ.data ? <LoadingRow /> :
          txQ.error ? <ErrorBox error={txQ.error} /> :
          <TransactionTable
            transactions={transactions.slice(0, 10)}
            currentUserId={active?.id}
          />
        )}
      </div>
    </>
  );
}