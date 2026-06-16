import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useCachedQuery } from '../hooks/cached_query.js';
import { useRefreshTimer } from '../hooks/refresh_timer.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings, useCurrency, HOME_PAGE_OPTIONS } from '../context/settings_ctx.tsx';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { listTransactions } from '../api/transactions.js';
import { listLinks } from '../api/links.js';
import { getDisplayName } from '../utils/display.js';
import { InfoIcon, CloseIcon, BulbIcon } from '../components/icons.tsx';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { TransactionTable } from '../components/tx_table.tsx';
import { RefreshStatus } from '../components/refresh_status.tsx';
import { generateStatements } from '../utils/fake_statements.js';
import { hideGet, hideSet } from '../utils/storage.ts';

const DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardPage() {
  const location = useLocation();
  const { active } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  const scambait = settings.scambait;
  const refresh = settings.autoRefresh;
  const { userInfo, refetchUserInfo } = useGlobalData();

  type TxList = { transactions: import('../components/tx_table.tsx').Transaction[] };
  type LinkList = { links: { id: number; status: string }[] };

  const txQ = useCachedQuery<TxList>(
    active ? `dashboard-tx:${active.id}` : null,
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { skip: !active }
  );

  const linksQ = useCachedQuery<LinkList>(
    active ? `dashboard-links:${active.id}` : null,
    () => listLinks(active!) as Promise<LinkList>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer(
    [txQ.refetch, linksQ.refetch, refetchUserInfo],
    { enabled: refresh && !!active }
  );

  const [hdHidden, setHdHidden] = useState(() => hideGet('sbshint'));

  const fakeStatements = useMemo(() => scambait ? generateStatements(1000, active?.id ?? null).slice(0, 10) : [], [scambait, active?.id]);

  const uniqueUserCount = useMemo(() => {
    const ids = new Set<number>();
    for (const tx of txQ.data?.transactions || []) {
      if (tx.sender) ids.add(tx.sender.id);
      if (tx.recipient) ids.add(tx.recipient.id);
    }
    ids.delete(Number(active?.id));
    return ids.size;
  }, [txQ.data, active?.id]);

  if (!active) {
    usePageTitle('Welcome')
    return (
      <>
        <h1 className="mt-0">Welcome to the MyPayIndia PWA</h1>
        <p className="mt-0 mb-0">You've reached the MyPayIndia PWA, "MyPWAIndia". This is the official, albeit alternative, responsive web app for MyPayIndia.<br /><br />
          You can navigate most of the app logged out, but to actually do everything, please <Link to="/i/flow/login" state={{ backgroundLocation: location }}>log in</Link>.
          If you don't have an account, you can <a href="https://mypayindia.com/accountservices/register" target="_blank" rel="noopener noreferrer">register on the main site</a> and then log in here.<br /><br />Thanks, and have fun!</p>
        <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <BulbIcon /><span>If you are looking for the legacy app, you can find it here: <a href="https://legacy.app.mypayindia.com" target="_blank" rel="noopener noreferrer">https://legacy.app.mypayindia.com</a></span>
        </div>
      </>
    );
  }

  usePageTitle('Dashboard');

  const transactions = txQ.data?.transactions || [];
  const links = linksQ.data?.links || [];
  const activeLinks = links.filter((l) => l.status === 'active');
  return (
    <>
      <h1 className="mt-0">{scambait ? 'Hello' : 'Welcome back'}, {getDisplayName(active, settings.displayName)}{scambait ? '' : '!'}</h1>

      <div className="grid cols-3 mb-2">
        <div className="card stat-card">
          <span className="stat-label">Balance</span>
          <span className="stat-value">
            {format(userInfo?.balance ?? active?.lastBalance ?? 0)}
          </span>
          <span className="stat-sub">{getDisplayName(active, settings.displayName)}</span>
        </div>

        <div className="card stat-card">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">
            {scambait ? 150 + ((Number(active?.id) * 31 + 127) % 850) : transactions.length}
          </span>
          <span className="stat-sub">{scambait ? 'since 2017' : `with ${uniqueUserCount} different users`}</span>
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
        {scambait ? (
          <>
            <Link to="/account/transfer" className="btn secondary">Transfer funds</Link>
            <Link to="/dash/statements" className="btn ghost">Full statements</Link>
          </>
        ) : (
          settings.dashboardButtons.map((route, i) => {
            const opt = HOME_PAGE_OPTIONS.find((o) => o.value === route);
            return (
              <Link key={`${route}:${i}`} to={route} className="btn secondary">
                {opt ? opt.label : route}
              </Link>
            );
          })
        )}
      </div>

      {!hdHidden && !scambait && (
        <div className="alert mb-2" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}><BulbIcon /></span>
          <span style={{ flex: 1 }}>
            <strong className="stat-label">Tip</strong><br></br>MyPWAIndia understands (most) MyPayIndia.com URL paths - so coming from <strong>mypayindia.com/accountservices/transhist</strong> and replacing <strong>.com</strong> with <strong>.sbs</strong> will automatically take you to the right page!
          </span>
          <button
            className="btn ghost"
            style={{ flexShrink: 0, padding: '0 4px', lineHeight: 0 }}
            onClick={() => { hideSet('sbshint'); setHdHidden(true); }}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Recent activity</h3>
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
                hideLimitControl
              />
        )}
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          {scambait
            ? <Link to="/dash/statements" className="btn secondary" style={{ width: '100%' }}>View all transactions</Link>
            : <Link to="/account/history" className="btn secondary" style={{ width: '100%' }}>View all transactions</Link>
          }
        </div>
      </div>
      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={refresh} />
    </>
  );
}