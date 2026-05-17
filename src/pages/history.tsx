import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { listTransactions } from '../api/transactions.js';
import { TransactionTable } from '../components/tx_table.tsx';
import { LoadingRow, ErrorBox } from '../components/status.tsx';

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
        {loading && !data ? <LoadingRow /> :
         error ? <ErrorBox error={error} /> :
         <TransactionTable
           transactions={data?.transactions || []}
           currentUserId={active?.id}
         />}
      </div>
    </>
  );
}