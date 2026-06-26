import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { getTransaction } from '../api/transactions.js';
import { useCurrency } from '../context/settings_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { Modal } from '../components/modal.tsx';
import { CopyIcon } from '../components/icons.tsx';

type TxDetail = {
  transaction_id: string;
  id: number;
  status: string;
  amount: number;
  created: string;
  note?: string;
  sender?: { username: string; id: number };
  recipient?: { username: string; id: number };
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [value]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '0 0 0 6px',
        color: copied ? 'var(--success)' : 'var(--muted)',
        fontSize: '0.75rem',
        verticalAlign: 'middle',
        lineHeight: 1,
      }}
      aria-label="Copy"
    >
      {copied ? 'OK' : <CopyIcon />}
    </button>
  );
}

function Field({ label, value, display, style, showCopy = false }: { label: string; value: string; display?: React.ReactNode; style?: React.CSSProperties; showCopy?: boolean }) {
  return (
    <div style={style}>
      <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 3 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
        <span>{display ?? value}</span>
        {showCopy && <CopyButton value={value} />}
      </div>
    </div>
  );
}

export default function TransactionModal() {
  const { active } = useAuth();
  const format = useCurrency();
  const navigate = useNavigate();
  const location = useLocation();
  const id = location.pathname.split('/').pop();
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';

  const { data, loading, error } = useApiCall<TxDetail>(
    () => getTransaction(active!, id!) as Promise<TxDetail>,
    [active?.token, id]
  );

  const bgLoc = (location.state as any)?.backgroundLocation;

  function handleClose() {
    if (bgLoc) {
      navigate(-1);
    } else {
      navigate('/dash');
    }
  }

  function otherUsername() {
    if (!data || !active) return '';
    return outgoing ? data.recipient?.username ?? '' : data.sender?.username ?? '';
  }

  function handleNewTransfer() {
    const to = otherUsername();
    navigate(`/account/transfer?to=${encodeURIComponent(to)}`);
  }

  function handleReturn() {
    const to = otherUsername();
    const amountRu = (data?.amount ?? 0) / 100;
    const message = `Return of #${data?.id ?? ''}`;
    const qs = new URLSearchParams({ to, amount: String(amountRu), message }).toString();
    navigate(`/account/transfer?${qs}`);
  }

  const outgoing = data && active ? data.sender?.id === active.id : false;
  const deeplinkOfficial = data ? `https://mypayindia.com/accountservices/trans?id=${data.id}` : '';
  const deeplinkAlt = data ? `https://mypayindia.sbs/i/flow/transaction/${data.transaction_id}` : '';

  return (
    <Modal
      open
      onClose={handleClose}
      title={data ? (outgoing ? `Transaction to @${data.recipient?.username ?? '?'}` : `Transaction from @${data.sender?.username ?? '?'}`) : 'Transaction'}
      className="slide"
    >
      {loading && !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton width={160} height={48} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i}>
                <Skeleton width={40} height={11} style={{ marginBottom: 6 }} />
                <Skeleton width={`${80 + (i % 3) * 24}px`} height={15} />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : data && (
        <>
          <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 3 }}>Amount</div>
          <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 20 }}>
            <div
              className="balance-display"
              style={{ color: outgoing ? 'var(--alert-error)' : 'var(--success)', marginBottom: 0 }}
            >
              {outgoing ? '-' : '+'}{format(data.amount)}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
            <Field label="From" value={`@${data.sender?.username}`} display={<strong>@{data.sender?.username}</strong>} showCopy />
            <Field label="When" value={formatDate(data.created)} />
            <Field label="To" value={`@${data.recipient?.username}`} display={<strong>@{data.recipient?.username}</strong>} showCopy />
            <Field label="ID" value={`#${data.id}`} display={<span className="mono">#{data.id}</span>} showCopy />
            <div style={{ gridColumn: '1' }}>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 3 }}>Deeplinks</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}><a href={deeplinkOfficial} target="_blank" rel="noopener noreferrer">MyPayIndia</a><CopyButton value={deeplinkOfficial} /></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}><a href={deeplinkAlt} target="_blank" rel="noopener noreferrer">MyPWAIndia</a><CopyButton value={deeplinkAlt} /></div>
            </div>
            <Field label="Transaction ID" value={data.transaction_id} display={<span className="mono">{data.transaction_id}</span>} style={{ gridColumn: '2' }} showCopy />
          </div>

          {data.note && (
            <div style={{ marginTop: 16 }}>
              <Field label="Note" value={data.note} showCopy />
            </div>
          )}
          <div style={{ marginTop: 18, display: 'flex', gap: 8 }}>
            <button type="button" className="secondary" onClick={handleNewTransfer}>
              New transfer to them
            </button>
            {!outgoing && (
              <button type="button" className="secondary" onClick={handleReturn}>
                Return it
              </button>
            )}
            <button type="button" onClick={handleClose}>
              OK
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
