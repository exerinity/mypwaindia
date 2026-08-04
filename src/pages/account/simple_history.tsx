import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { useMemo, Suspense, lazy } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useSettings, useCurrency } from '../../context/settings_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { listTransactions } from '../../api/transactions.js';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';
import { ChevronRight } from '../../components/ui/icons.tsx';
import type { Transaction } from '../../components/data/tx_table.tsx';

const RefreshStatus = lazy(() => import('../../components/ui/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));

interface DayGroup { key: string; iso: string; items: Transaction[] }

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  const ordered = [...transactions].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  for (const tx of ordered) {
    const date = new Date(tx.created);
    if (isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, iso: tx.created, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(tx);
  }

  return groups;
}

export default function SimpleHistoryPage() {
  usePageTitle('Simple history');
  const { active } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  const location = useLocation();
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));

  type TxList = { transactions: Transaction[] };
  const { data, loading, error, refetch } = useCachedQuery<TxList>(
    active ? `history-tx:${active.id}` : null,
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer([refetch], { enabled: settings.autoRefresh && !!active });

  const groups = useMemo(() => groupByDay(data?.transactions ?? []), [data]);

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <h1 className="mt-0">Simple history</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        Back to <Link to="/account/history">transaction history</Link>?
      </p>

      {loading && !data ? (
        <div className="simple-tx-list">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="simple-tx-row">
              <span className="simple-tx-main">
                <Skeleton width={110} height={13} />
                <Skeleton width={80} height={13} />
              </span>
              <span className="simple-tx-meta">
                <Skeleton width={44} height={13} />
                <Skeleton width={64} height={13} />
              </span>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : !groups.length ? (
        <div className="empty">Nothing yet</div>
      ) : (
        <div className="simple-tx-list">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="simple-tx-day">
                {datesMod ? datesMod.formatDayHeading(group.iso) : '...'}
              </div>
              {group.items.map((tx) => {
                const outgoing = active?.id != null && tx.sender?.id === active.id;
                const other = (outgoing ? tx.recipient?.username : tx.sender?.username) || 'someone';
                return (
                  <Link
                    key={tx.id}
                    to={`/i/flow/transaction/${tx.transaction_id}`}
                    state={{ backgroundLocation: location }}
                    className="simple-tx-row"
                  >
                    <span className="simple-tx-main">
                      <span className="simple-tx-name">{other}</span>
                      <span className={`simple-tx-amount ${outgoing ? 'out' : 'in'}`}>
                        {outgoing ? '-' : '+'}{format(tx.amount)}
                      </span>
                    </span>
                    <span className="simple-tx-meta">
                      <span className="simple-tx-time">
                        {datesMod ? datesMod.formatTimeShort(tx.created) : '...'}
                      </span>
                      <span className={`simple-tx-status ${tx.status}`}>
                        {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                      </span>
                    </span>
                    <span className="simple-tx-chevron"><ChevronRight size={16} /></span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />
    </Suspense>
  );
}
