import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { getTransaction } from '../api/transactions.js';
import { useCurrency } from '../context/SettingsContext.jsx';
import { formatDate } from '../utils/dates.js';
import { LoadingRow, ErrorBox } from '../components/Status.jsx';
import { ArrowLeftIcon } from '../components/Icons.jsx';


export default function TransactionPage() {
  usePageTitle('Transaction');
  const { id } = useParams();
  const { active } = useAuth();
  const format = useCurrency();

  const { data, loading, error } = useApiCall(
    () => getTransaction(active, id),
    [active?.token, id]
  );

  return (
    <>
      <h1 className="mt-0">Transaction</h1>
      <p className="muted">
        <Link to="/dash/account/history"><ArrowLeftIcon></ArrowLeftIcon> Back to history</Link>
      </p>

      {loading && !data ? <LoadingRow /> :
       error ? <ErrorBox error={error} /> :
       data && (
        <div className="card">
          <div className="row spread">
            <h3 className="mt-0 mono">{data.transaction_id}</h3>
            <span className={`link-status ${data.status}`}>{data.status}</span>
          </div>
          <div className="balance-display">
            {format(data.amount)}
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div className="grid cols-2">
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>From</div>
              <div><strong>{data.sender?.username}</strong> <span className="muted">#{data.sender?.id}</span></div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>To</div>
              <div><strong>{data.recipient?.username}</strong> <span className="muted">#{data.recipient?.id}</span></div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>When</div>
              <div>{formatDate(data.created)}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem' }}>ID</div>
              <div className="mono">#{data.id}</div>
            </div>
          </div>
          {data.note && (
            <>
              <div className="muted mt-2" style={{ fontSize: '0.8rem' }}>Note</div>
              <p>{data.note}</p>
            </>
          )}
        </div>
      )}
    </>
  );
}