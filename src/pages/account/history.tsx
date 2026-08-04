import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useSettings, useCurrency } from '../../context/settings_ctx.tsx';
import { listTransactions } from '../../api/transactions.js';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';

const TransactionTable = lazy(() => import('../../components/data/tx_table.tsx').then((m) => ({ default: m.TransactionTable })));
const RefreshStatus = lazy(() => import('../../components/ui/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));

export default function HistoryPage() {
  usePageTitle('Transaction history');
  const { active } = useAuth();
  const { settings } = useSettings();
  const format = useCurrency();
  type TxList = { transactions: import('../../components/data/tx_table.tsx').Transaction[] };
  const { data, loading, error, refetch } = useCachedQuery<TxList>(
    active ? `history-tx:${active.id}` : null,
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer([refetch], { enabled: settings.autoRefresh && !!active });

  const stats = useMemo(() => {
    const txs = data?.transactions;
    if (!txs || !active?.id) return null;
    let outgoing = 0, incoming = 0;
    const sentTo: Record<string, number> = {};
    const receivedFrom: Record<string, number> = {};
    for (const tx of txs) {
      if (tx.status === 'cancelled') continue;
      if (tx.sender?.id === active.id) {
        outgoing += tx.amount;
        const name = tx.recipient?.username;
        if (name) sentTo[name] = (sentTo[name] ?? 0) + tx.amount;
      } else if (tx.recipient?.id === active.id) {
        incoming += tx.amount;
        const name = tx.sender?.username;
        if (name) receivedFrom[name] = (receivedFrom[name] ?? 0) + tx.amount;
      }
    }
    const topSent = Object.entries(sentTo).sort((a, b) => b[1] - a[1])[0];
    const topReceived = Object.entries(receivedFrom).sort((a, b) => b[1] - a[1])[0];
    return { total: txs.length, outgoing, incoming, topSent, topReceived };
  }, [data, active?.id]);

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <h1 className="mt-0">Transaction history</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        <Link to="/account/history/simple">Simple history...</Link>
      </p>

      {!settings.scambait && stats && (
        <div className="card" style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px 24px' }}>
          <div>
            <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Total transactions to list</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stats.total}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Total outgoing</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--alert-error)' }}>{format(stats.outgoing)}</div>
          </div>
          <div>
            <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Total incoming</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--success)' }}>{format(stats.incoming)}</div>
          </div>
          {stats.topSent && (
            <div>
              <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Largest receiver</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stats.topSent[0]}</div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>{format(stats.topSent[1])} sent</div>
            </div>
          )}
          {stats.topReceived && (
            <div>
              <div className="muted" style={{ fontSize: '0.78rem', marginBottom: 4 }}>Largest donor</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{stats.topReceived[0]}</div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>{format(stats.topReceived[1])} received</div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        {loading && !data ? (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
                <Skeleton width={80} height={12} />
                <Skeleton style={{ flex: 1, height: 12, width: `${40 + (i % 3) * 15}%` }} />
                <Skeleton width={90} height={12} />
              </div>
            ))}
          </div>
        ) :
         error ? <ErrorBox error={error} /> :
         <TransactionTable
           transactions={data?.transactions || []}
           currentUserId={active?.id}
         />}
      </div>
      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />
    </Suspense>
  );
}