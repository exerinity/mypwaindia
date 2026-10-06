import { utility_classes } from '../../styles/utils.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { useMemo, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useSettings, useCurrency, HOME_PAGE_OPTIONS } from '../../context/settings_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { listTransactions } from '../../api/transactions.js';
import { listLinks } from '../../api/links.js';
import { InfoIcon, CloseIcon, BulbIcon } from '../../components/ui/icons.tsx';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';
import { RELEASES } from '../information/release_notes.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { hideGet, hideSet } from '../../utils/storage.ts';
import type { Account } from '../../context/auth_ctx.tsx';

const TransactionTable = lazy(() => import('../../components/data/tx_table.tsx').then((m) => ({ default: m.TransactionTable })));
const SimpleHistoryList = lazy(() => import('../../components/data/simple_history_list.tsx').then((m) => ({ default: m.SimpleHistoryList })));
const RefreshStatus = lazy(() => import('../../components/ui/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));
const AppFooter = lazy(() => import('../../components/shell/app_footer.tsx').then((m) => ({ default: m.AppFooter })));

function DisplayName({ account, mode }: { account: Account | null; mode: string }) {
  const displayMod = useLazyModule(() => import('../../utils/display.js'));
  return displayMod
    ? <>{displayMod.getDisplayName(account, mode)}</>
    : <span className={`spinner ${utility_classes.spinner}`} style={{ verticalAlign: 'middle' }} />;
}

export default function DashboardPage() {
  const location = useLocation();
  const { active } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  const refresh = settings.autoRefresh;
  const { userInfo, userInfoLoading, refetchUserInfo } = useGlobalData();

  type TxList = { transactions: import('../../components/data/tx_table.tsx').Transaction[] };
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

  const uniqueUserCount = useMemo(() => {
    const ids = new Set<number>();
    for (const tx of txQ.data?.transactions || []) {
      if (tx.sender) ids.add(tx.sender.id);
      if (tx.recipient) ids.add(tx.recipient.id);
    }
    ids.delete(Number(active?.id));
    return ids.size;
  }, [txQ.data, active?.id]);

  const weekChange = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let net = 0;
    for (const tx of txQ.data?.transactions || []) {
      if (new Date(tx.created).getTime() < cutoff) continue;
      if (tx.recipient?.id === active?.id) net += tx.amount;
      else if (tx.sender?.id === active?.id) net -= tx.amount;
    }
    return net;
  }, [txQ.data, active?.id]);

  usePageTitle(active ? 'Dashboard' : 'Welcome to the MyPayIndia PWA');

  if (!active) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <h1 className={`mt-0 ${utility_classes.mt_0}`}>Welcome to the MyPayIndia PWA</h1>
        <p className={`mt-0 mb-0 ${utility_classes.mt_0}`}>You've reached the MyPayIndia PWA, "MyPWAIndia". This is the official, albeit alternative, responsive web app for MyPayIndia.<br /><br />
          You can navigate the app logged out, but to actually do anything, please <Link to="/i/flow/login" state={{ backgroundLocation: location }}>log in</Link>.
          If you don't have an account, you can <a href="https://mypayindia.com/auth/register" target="_blank" rel="noopener noreferrer">register on the main site</a> and then log in here.<br /><br />Thanks, and have fun!</p>
        <div className={`alert alert-info mb-2 ${alert_classes.info} ${utility_classes.mb_2}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}><BulbIcon /></span>
          <span style={{ flex: 1 }}>
            <strong className={stat_classes.label}>Tip</strong><br></br>MyPWAIndia understands (most) MyPayIndia.com URL paths - so coming from <strong>mypayindia.com/account/transfers</strong> and replacing <strong>.com</strong> with <strong>.sbs</strong> will automatically take you to the right page!
          </span>
        </div>
        <AppFooter version={RELEASES[0].version} />
      </Suspense>
    );
  }

  const transactions = txQ.data?.transactions || [];
  const links = linksQ.data?.links || [];
  const activeLinks = links.filter((l) => l.status === 'active');
  const balanceValue = userInfo?.balance ?? (typeof active?.lastBalance === 'number' ? active.lastBalance : null);
  const balanceLoading = balanceValue === null && userInfoLoading;
  const txLoading = txQ.loading && !txQ.data;
  const linksLoading = linksQ.loading && !linksQ.data;
  return (
    <Suspense fallback={<ContentSkeleton />}>
      <h1 className={`mt-0 ${utility_classes.mt_0}`}>Welcome back, <DisplayName account={active} mode={settings.displayName} />!</h1>

      <div className={`grid cols-3 mb-2 ${card_classes.grid_three} ${utility_classes.mb_2}`}>
        <div className={`card ${stat_classes.card} ${card_classes.card}`}>
          <span className={stat_classes.label}>Balance</span>
          <span className={stat_classes.value}>
            {balanceLoading
              ? <span className={`spinner ${utility_classes.spinner}`} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
              : format(balanceValue ?? 0)}
          </span>
          <span className={stat_classes.sub} style={{ color: weekChange > 0 ? 'var(--success)' : weekChange < 0 ? 'var(--alert-error)' : undefined }}>
            {txLoading
              ? <span className={`spinner ${utility_classes.spinner}`} style={{ width: 12, height: 12, borderWidth: 2, verticalAlign: 'middle' }} />
              : `${weekChange > 0 ? '+' : weekChange < 0 ? '-' : ''}${format(Math.abs(weekChange))} this week`}
          </span>
        </div>

        <div className={`card ${stat_classes.card} ${card_classes.card}`}>
          <span className={stat_classes.label}>Transactions</span>
          <span className={stat_classes.value}>
            {txLoading
              ? <span className={`spinner ${utility_classes.spinner}`} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
              : transactions.length}
          </span>
          <span className={stat_classes.sub}>with {uniqueUserCount} different users</span>
        </div>

        <div className={`card ${stat_classes.card} ${card_classes.card}`}>
          <span className={stat_classes.label}>Active links</span>
          <span className={stat_classes.value}>
            {linksLoading
              ? <span className={`spinner ${utility_classes.spinner}`} style={{ width: 22, height: 22, verticalAlign: 'middle' }} />
              : activeLinks.length}
          </span>
          <span className={stat_classes.sub}>{links.length} total created</span>
        </div>
      </div>

      <div className={`btn-row mb-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mb_2}`}>
        {settings.dashboardButtons.map(({ route, style }, i) => {
          const opt = HOME_PAGE_OPTIONS.find((o) => o.value === route);
          return (
            <Link key={`${route}:${i}`} to={route} className={style === 'primary' ? 'btn' : `btn ${style}`}>
              {opt ? opt.label : route}
            </Link>
          );
        })}
      </div>

      {!hdHidden && (
        <div className={`alert mb-2 ${alert_classes.alert} ${utility_classes.mb_2}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}><BulbIcon /></span>
          <span style={{ flex: 1 }}>
            <strong className={stat_classes.label}>Tip</strong><br></br>MyPWAIndia understands (most) MyPayIndia.com URL paths - so coming from <strong>mypayindia.com/account/transfers</strong> and replacing <strong>.com</strong> with <strong>.sbs</strong> will automatically take you to the right page!
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

      <div className={`card ${card_classes.card}`}>
        <h3 style={{ margin: '0 0 12px' }}>Recent activity</h3>
        {txQ.loading && !txQ.data ? (
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
            settings.dashboardHistory === 'simple_history'
              ? <SimpleHistoryList transactions={transactions.slice(0, 10)} currentUserId={active.id} embedded />
              : <TransactionTable
                  transactions={transactions.slice(0, 10)}
                  currentUserId={active.id}
                  hideLimitControl
                />
        }
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <Link to={settings.dashboardHistory === 'simple_history' ? '/account/history/simple' : '/account/history'} className="btn secondary" style={{ width: '100%' }}>View all transactions</Link>
        </div>
      </div>
      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={refresh} />
    </Suspense>
  );
}
