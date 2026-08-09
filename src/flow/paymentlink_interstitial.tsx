import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { getLink, claimLink } from '../api/links.js';
import { getUserInfo } from '../api/user.js';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import { Modal } from '../components/ui/modal.tsx';

type LinkPreview = { creator?: { username: string }; amount: number; note?: string; created: string; status: string };

export default function ClaimModal() {
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const token = decodeURIComponent(location.pathname.split('/').pop() || '');
  const moneyMod = useLazyModule(() => import('../utils/money.js'));
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const formatINR = (n: number) => moneyMod ? moneyMod.formatINR(n) : '...';
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';
  const [claiming, setClaiming] = useState(false);

  const { data, loading, error } = useApiCall<LinkPreview>(
    () => getLink(token) as Promise<LinkPreview>,
    [token]
  );

  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  function handleClose() {
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

  return (
    <Modal open onClose={handleClose} title="Claim a payment link">
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
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>From</div>
              <div>@{data.creator?.username ?? '-'}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Created</div>
              <div>{formatDate(data.created)}</div>
            </div>
          </div>

          <div style={{ marginBottom: data.note ? 16 : 20 }}>
            <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Amount</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="balance-display" style={{ fontSize: '2rem' }}>{formatINR(data.amount)}</span>
              <span className={`link-status ${data.status}`}>{data.status}</span>
            </div>
          </div>

          {data.note && (
            <div style={{ marginBottom: 20 }}>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Note</div>
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

          <button onClick={handleClaim} disabled={claiming} style={{ width: '100%' }}>
            {claiming ? <><span className="spinner" /> Claiming...</> : active ? `Claim ${formatINR(data.amount)}` : 'Log in to claim'}
          </button>
        </>
      )}
    </Modal>
  );
}
