import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { getTransaction, transfer } from '../api/transactions.js';
import { getUserInfo } from '../api/user.js';
import { useCurrency } from '../context/settings_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import { Modal } from '../components/ui/modal.tsx';
import { CopyIcon, ArrowDownLeftIcon, ArrowUpRightIcon, SuccessIcon } from '../components/ui/icons.tsx';

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
  const { active, updateBalance } = useAuth();
  const format = useCurrency();
  const toast = useToast();
  const navigate = useNavigate();
  const [returning, setReturning] = useState(false);
  const [returned, setReturned] = useState(false);
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

  async function handleReturn(e: React.MouseEvent<HTMLButtonElement>) {
    const to = otherUsername();
    const message = `Return of #${data?.id ?? ''}`;

    if (e.shiftKey) {
      const amount = data?.amount ?? 0;
      if (!to || amount <= 0) return;
      setReturning(true);
      try {
        await transfer(active!, { recipient: to, amount, note: message });
        setReturned(true);
        toast.success(`Returned ${format(amount)} to @${to}`);
        try {
          const info = await getUserInfo(active!) as { balance: number };
          updateBalance(active!.id, info.balance);
        } catch { }
      } catch (err) {
        const { describeError } = await import('../utils/errors.js');
        toast.error(describeError(err));
      } finally {
        setReturning(false);
      }
      return;
    }

    const amountRu = (data?.amount ?? 0) / 100;
    const qs = new URLSearchParams({ to, amount: String(amountRu), message }).toString();
    navigate(`/account/transfer?${qs}`);
  }

  const outgoing = data && active ? data.sender?.id === active.id : false;
  const deeplinkOfficial = data ? `https://mypayindia.com/account/transfers/${data.id}` : '';
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
            <div
              className="balance-display"
              style={{ color: outgoing ? 'var(--alert-error)' : 'var(--success)', marginBottom: 0 }}
            >
              {outgoing ? '-' : '+'}{format(data.amount)}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 44,
                height: 44,
                flexShrink: 0,
                borderRadius: 12,
                color: 'var(--fg)',
                background: outgoing
                  ? 'color-mix(in srgb, var(--alert-error) 12%, transparent)'
                  : 'color-mix(in srgb, var(--success) 12%, transparent)',
                border: `1px solid ${outgoing
                  ? 'color-mix(in srgb, var(--alert-error) 30%, transparent)'
                  : 'color-mix(in srgb, var(--success) 30%, transparent)'}`,
              }}
              aria-label={outgoing ? 'Outgoing' : 'Incoming'}
            >
              {outgoing ? <ArrowUpRightIcon size={24} /> : <ArrowDownLeftIcon size={24} />}
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
              New transfer to @{otherUsername()}
            </button>
            {!outgoing && (
              <button
                type="button"
                className="secondary"
                onClick={handleReturn}
                disabled={returning || returned}
              >
                {returning ? (
                  <><span className="spinner" /> Returning...</>
                ) : returned ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><SuccessIcon size={15} /> Returned</span>
                ) : 'Return it'}
              </button>
            )}
            <button type="button" onClick={handleClose}>
              OK
            </button>
          </div>
          {!outgoing && !returned && (
            <div className="muted" style={{ marginTop: 8, fontSize: '0.75rem' }}>
              Tip: Hold shift while pressing Return to fast-return
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
