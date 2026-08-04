import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useApiCall } from '../../hooks/api_call.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { getTransaction } from '../../api/transactions.js';
import { useCurrency } from '../../context/settings_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';
import { ArrowLeftIcon } from '../../components/ui/icons.tsx';


export default function TransactionPage() {
  usePageTitle('Transaction');
  const { id } = useParams();
  const { active } = useAuth();
  const format = useCurrency();
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';

  type TxDetail = { transaction_id: string; id: number; status: string; amount: number; created: string; note?: string; sender?: { username: string; id: number }; recipient?: { username: string; id: number } };
  const { data, loading, error } = useApiCall<TxDetail>(
    () => getTransaction(active!, id!) as Promise<TxDetail>,
    [active?.token, id]
  );

  return (
    <>
      <h1 className="mt-0">Transaction</h1>
      <p className="mt-0 mb-0">
        <Link to="/account/history" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeftIcon /> Back to history</Link>
      </p>

      {loading && !data ? (
        <div className="card">
          <div className="row spread" style={{ marginBottom: 12 }}>
            <Skeleton width={220} height={18} />
            <Skeleton width={64} height={18} radius={999} />
          </div>
          <Skeleton width={160} height={38} style={{ marginBottom: 16 }} />
          <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
          <div className="grid cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={40} height={11} style={{ marginBottom: 6 }} />
                <Skeleton width={`${80 + (i % 3) * 24}px`} height={15} />
              </div>
            ))}
          </div>
        </div>
      ) :
       error ? <ErrorBox error={error} /> :
       data && (
        <div className="card">
          <div className="row spread">
            <h3 className="mt-0 mono">{data.transaction_id}</h3>
            <span className={`link-status ${data.status}`}>{data.status}</span>
          </div>
          <div className="balance-display" style={{ color: data.sender?.id === active?.id ? 'var(--alert-error)' : 'var(--success)' }}>
            {data.sender?.id === active?.id ? '-' : '+'}{format(data.amount)}
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