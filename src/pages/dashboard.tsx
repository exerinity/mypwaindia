import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings, useCurrency } from '../context/settings_ctx.tsx';
import { getUserInfo, getRestrictions } from '../api/user.js';
import { listTransactions } from '../api/transactions.js';
import { listLinks } from '../api/links.js';
import { getDisplayName } from '../utils/display.js';
import { InfoIcon, WarningIcon } from '../components/icons.tsx';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { TransactionTable } from '../components/tx_table.tsx';
import { getRestrictionInfo } from '../utils/restrictions.js';
import { generateStatements } from '../utils/fake_statements.js';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { active, updateAccountInfo } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  const scambait = settings.scambait;
  const refresh = settings.autoRefresh;

  type UserInfo = { balance: number; first_name: string; last_name: string };
  type TxList = { transactions: import('../components/tx_table.tsx').Transaction[] };
  type LinkList = { links: { id: number; status: string }[] };
  type Restrictions = { restrictions: Record<string, { active: boolean }> };

  const userQ = useApiCall<UserInfo>(async () => {
    const info = await getUserInfo(active!) as UserInfo;
    updateAccountInfo(active!.id, { lastBalance: info.balance, firstName: info.first_name, lastName: info.last_name });
    return info;
  }, [active?.token], { refresh, skip: !active });

  const restrictionsQ = useApiCall<Restrictions>(
    () => getRestrictions(active!) as Promise<Restrictions>,
    [active?.token],
    { refresh, skip: !active }
  );

  const txQ = useApiCall<TxList>(
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { refresh, skip: !active }
  );

  const linksQ = useApiCall<LinkList>(
    () => listLinks(active!) as Promise<LinkList>,
    [active?.token],
    { refresh, skip: !active }
  );

  const fakeStatements = useMemo(() => scambait ? generateStatements(1000, active?.id ?? null).slice(0, 10) : [], [scambait, active?.id]);

  if (!active) {
    return (
      <>
        <h1 className="mt-0">Welcome, stranger!</h1>
        <p>You've reached the MyPayIndia PWA, "MyPWAIndia". This is the official, albeit alternative, responsive web app for MyPayIndia.<br /><br />
        You can navigate most of the app logged out, but to actually do everything, please <Link to="/i/flow/login">log in</Link>. 
        If you don't have an account, you can <a href="https://mypayindia.com/accountservices/register" target="_blank" rel="noopener noreferrer">register on the main site</a> and then log in here.<br /><br />Thanks, and have fun!</p>
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InfoIcon /><span>If you are looking for the legacy app, you can find it here: <a href="https://legacy.app.mypayindia.com" target="_blank" rel="noopener noreferrer">https://legacy.app.mypayindia.com</a></span>
        </div>
      </>
    );
  }

  const transactions = txQ.data?.transactions || [];
  const links = linksQ.data?.links || [];
  const activeLinks = links.filter((l) => l.status === 'active');
  const restrictions = restrictionsQ.data?.restrictions || {};
  const restrictionList = Object.entries(restrictions).filter(([, v]) => v?.active);

  return (
    <>
      <h1 className="mt-0">{scambait ? 'Hello' : 'Welcome back'}, {getDisplayName(active, settings.displayName)}{scambait ? '' : '!'}</h1>

      {restrictionList.length > 0 && (
        <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /><span><strong>Your account has some active restrictions:</strong>{' '}
          {restrictionList.map(([k]) => getRestrictionInfo(k).title).join(', ')}.
          {' '}<Link to="/account/restrictions" className="muted">More...</Link></span>
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
        <Link to="/account/transfer" className="btn secondary">Transfer funds</Link>
        {!scambait && <Link to="/links" className="btn secondary">Create a payment link</Link>}
        {!scambait && <Link to="/links:claim" className="btn secondary">Claim a payment link</Link>}
        {scambait
          ? <Link to="/dash/statements" className="btn ghost">Full statements</Link>
          : <Link to="/account/history" className="btn ghost">Full transaction history</Link>
        }
      </div>

      <div className="card">
        <div className="row spread mb-2">
          <h3 style={{ margin: 0 }}>Recent activity</h3>
          {scambait
            ? <Link to="/dash/statements" className="muted">View all</Link>
            : <Link to="/account/history" className="muted">View all</Link>
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
          txQ.loading && !txQ.data ? (
            <div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                  <Skeleton width={80} height={12} />
                  <Skeleton style={{ flex: 1, height: 12, width: `${40 + (i % 3) * 15}%` }} />
                  <Skeleton width={90} height={12} />
                </div>
              ))}
            </div>
          ) :
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