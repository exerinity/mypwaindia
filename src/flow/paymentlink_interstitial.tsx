import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { claimLink } from '../api/links.js';
import type { PaymentLinkInterstitialSubtask } from '../api/flow.ts';
import { getUserInfo } from '../api/user.js';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import { Modal } from '../components/ui/modal.tsx';
import { ExternalIcon } from '../components/ui/icons.tsx';

interface ClaimModalProps {
  subtask: PaymentLinkInterstitialSubtask | null;
  loading: boolean;
  error: unknown;
  embedded?: boolean;
  onClose?: () => void;
}

export default function ClaimModal({ subtask, loading, error, embedded = false, onClose }: ClaimModalProps) {
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const moneyMod = useLazyModule(() => import('../utils/money.js'));
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const formatINR = (n: number) => moneyMod ? moneyMod.formatINR(n) : '...';
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';
  const [claiming, setClaiming] = useState(false);
  const detail = subtask?.payment_link_interstitial;
  const data = detail?.payment_link;
  const token = detail?.token ?? '';
  const labels = detail?.labels;
  const claimAction = detail?.actions.find((action) => action.link_id === 'claim');
  const externalAction = detail?.actions.find((action) => action.link_id === 'claim_external');

  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  function handleClose() {
    if (onClose) {
      onClose();
      return;
    }
    if (bgLoc) navigate(-1);
    else navigate('/');
  }

  async function handleClaim() {
    if (!active) {
      const back = location.pathname + location.search;
      navigate(`/i/flow/login?goto=${encodeURIComponent(back)}`, {
        state: bgLoc ? { backgroundLocation: bgLoc } : undefined,
      });
      return;
    }
    setClaiming(true);
    try {
      const res = await claimLink(active, token) as { transaction_id: string };
      toast.success('Link claimed!');
      try {
        const info = await getUserInfo(active) as { balance: number };
        updateBalance(active.id, info.balance);
      } catch {}
      navigate(`/i/flow/transaction/${res.transaction_id}`, { replace: true, state: bgLoc ? { backgroundLocation: bgLoc } : undefined });
    } catch (e) {
      const { describeError } = await import('../utils/errors.js');
      toast.error(describeError(e));
    } finally {
      setClaiming(false);
    }
  }

  const content = (
    <>
      {loading && !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="row spread">
            <Skeleton width={120} height={18} />
            <Skeleton width={60} height={22} radius={10} />
          </div>
          <div className="grid cols-2">
            <div>
              <Skeleton width={30} height={11} style={{ marginBottom: 6 }} />
              <Skeleton width={100} height={15} />
            </div>
            <div>
              <Skeleton width={45} height={11} style={{ marginBottom: 6 }} />
              <Skeleton width={130} height={15} />
            </div>
          </div>
          <Skeleton width={160} height={36} radius={6} />
          <Skeleton width="100%" height={40} radius={8} />
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : data && (
        <>
          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>{labels?.from ?? 'From'}</div>
              <div>@{data.creator?.username ?? '-'}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>{labels?.created ?? 'Created'}</div>
              <div>{formatDate(data.created)}</div>
            </div>
          </div>

          <div style={{ marginBottom: data.note ? 16 : 20 }}>
            <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>{labels?.amount ?? 'Amount'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="balance-display" style={{ fontSize: '2rem' }}>{formatINR(data.amount)}</span>
              <span className={`link-status ${data.status}`}>{data.status}</span>
            </div>
          </div>

          {data.note && (
            <div style={{ marginBottom: 20 }}>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>{labels?.note ?? 'Note'}</div>
              <div style={{
                background: 'var(--surface-2, var(--bg))',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--muted)',
                overflowWrap: 'anywhere',
              }}>
                {data.note}
              </div>
            </div>
          )}

          {claimAction && (
            <button onClick={handleClaim} disabled={claiming} style={{ width: '100%' }}>
              {claiming
                ? <><span className="spinner" /> {claimAction.pending_label ?? 'Claiming...'}</>
                : active
                  ? `${claimAction.label} ${formatINR(data.amount)}`
                  : (claimAction.logged_out_label ?? 'Log in to claim')}
            </button>
          )}
          {externalAction?.url && (
            <a
              href={externalAction.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn secondary"
              style={{ width: '100%', marginTop: 10, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              {externalAction.label} <ExternalIcon />
            </a>
          )}
        </>
      )}
    </>
  );

  if (embedded) return content;
  return <Modal open onClose={handleClose} title={detail?.primary_text.text ?? 'Claim a payment link'}>{content}</Modal>;
}
