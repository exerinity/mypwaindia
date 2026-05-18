import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { listTransactions } from '../api/transactions.js';
import { TransactionTable } from '../components/tx_table.tsx';
import { Skeleton, ErrorBox } from '../components/status.tsx';

export default function HistoryPage() {
  usePageTitle('Transaction history');
  const { active } = useAuth();
  const { settings } = useSettings();
  type TxList = { transactions: import('../components/tx_table.tsx').Transaction[] };
  const { data, loading, error } = useApiCall<TxList>(
    () => listTransactions(active!) as Promise<TxList>,
    [active?.token],
    { refresh: settings.autoRefresh }
  );

  return (
    <>
      <h1 className="mt-0">Transaction history</h1>
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
    </>
  );
}