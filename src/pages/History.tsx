import { useAuth } from '../context/AuthContext.tsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useSettings } from '../context/SettingsContext.tsx';
import { listTransactions } from '../api/transactions.js';
import { TransactionTable } from '../components/TransactionTable.tsx';
import { LoadingRow, ErrorBox } from '../components/Status.tsx';

export default function HistoryPage() {
  usePageTitle('Transaction history');
  const { active } = useAuth();
  const { settings } = useSettings();
  type TxList = { transactions: import('../components/TransactionTable.tsx').Transaction[] };
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