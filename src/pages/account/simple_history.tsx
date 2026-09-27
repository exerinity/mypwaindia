import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useSettings } from '../../context/settings_ctx.tsx';
import { listTransactions } from '../../api/transactions.js';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';
import type { Transaction } from '../../components/data/tx_table.tsx';

const RefreshStatus = lazy(() => import('../../components/ui/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));
const SimpleHistoryList = lazy(() => import('../../components/data/simple_history_list.tsx').then((m) => ({ default: m.SimpleHistoryList })));

export default function SimpleHistoryPage() {
  usePageTitle('Simple history');
  const { active } = useAuth();
  const { settings } = useSettings();

  type TxList = { transactions: Transaction[] };
  const { data, loading, error, refetch } = useCachedQuery<TxList>(
    active ? `history-tx:${active.id}` : null,
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer([refetch], { enabled: settings.autoRefresh && !!active });

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
      ) : (
        <SimpleHistoryList transactions={data?.transactions ?? []} currentUserId={active?.id} />
      )}

      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />
    </Suspense>
  );
}
