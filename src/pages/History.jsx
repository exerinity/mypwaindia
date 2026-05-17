import { useAuth } from '../context/AuthContext.jsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { listTransactions } from '../api/transactions.js';
import { TransactionTable } from '../components/TransactionTable.jsx';
import { LoadingRow, ErrorBox } from '../components/Status.jsx';

export default function HistoryPage() {
  usePageTitle('Transaction history');
  const { active } = useAuth();
  const { settings } = useSettings();
  const { data, loading, error } = useApiCall(
    () => listTransactions(active),
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