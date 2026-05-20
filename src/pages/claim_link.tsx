import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { getLink, claimLink } from '../api/links.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getUserInfo } from '../api/user.js';
import { formatINR } from '../utils/money.js';
import { formatDate } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { ErrorIcon } from '../components/icons.tsx';
import { Skeleton } from '../components/status.tsx';

type LinkPreview = { creator?: { username: string }; amount: number; note?: string; created: string; status: string };

export default function ClaimLinkPage() {
  usePageTitle('Claim a link');
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { token: routeToken } = useParams<{ token: string }>();
  const [token, setToken] = useState(routeToken || '');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [claiming, setClaiming] = useState(false);

  async function inspect(t?: string) {
    const trimmed = (t ?? token).trim();
    if (!trimmed) return;
    if (trimmed !== routeToken) navigate(`/links/claim/${trimmed}`, { replace: true });
    setLoadingPreview(true);
    setPreview(null);
    setPreviewError(null);
    try {
      setPreview(await getLink(trimmed) as LinkPreview);
    } catch (e) {
      setPreviewError(e);
    } finally {
      setLoadingPreview(false);
    }
  }

  useEffect(() => {
    if (token) inspect(token);
  }, []);

  function handleTokenChange(value: string) {
    let t = value.trim();
    try {
      const url = new URL(t);
      const fromUrl = url.searchParams.get('token');
      if (fromUrl) t = fromUrl;
    } catch { /* not a url */ }
    setToken(t);
  }

  async function handleClaim() {
    if (!token.trim()) return;
    setClaiming(true);
    try {
      const res = await claimLink(active!, token.trim()) as { transaction_id: string };
      toast.success('Link claimed!');
      try {
        const info = await getUserInfo(active!) as { balance: number };
        updateBalance(active!.id, info.balance);
      } catch { /* non-critical */ }
      navigate(`/i/transaction/${res.transaction_id}`);
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setClaiming(false);
    }
  }

  return (
    <>
      <h1 className="mt-0">Claim a payment link</h1>

      <div className="card mb-2" style={{ maxWidth: 520 }}>
        <h3 className="mt-0">Enter link or token</h3>
        <input
          type="text"
          value={token}
          placeholder="Paste a payment link or token"
          onChange={(e) => handleTokenChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && inspect()}
          disabled={claiming}
        />
        <div style={{ marginTop: 10 }}>
          <button
            className="secondary"
            onClick={() => inspect()}
            disabled={!token.trim() || loadingPreview || claiming}
          >
            Look up
          </button>
        </div>
      </div>

      {previewError != null && (
        <div className="card mb-2" style={{ maxWidth: 520 }}>
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
            <ErrorIcon />
            <span>{describeError(previewError)}</span>
          </div>
        </div>
      )}

      {loadingPreview && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="row spread" style={{ marginBottom: 16 }}>
            <Skeleton width={120} height={18} />
            <Skeleton width={60} height={22} radius={10} />
          </div>
          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div>
              <Skeleton width={30} height={11} style={{ marginBottom: 6 }} />
              <Skeleton width={100} height={15} />
            </div>
            <div>
              <Skeleton width={45} height={11} style={{ marginBottom: 6 }} />
              <Skeleton width={130} height={15} />
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <Skeleton width={50} height={11} style={{ marginBottom: 8 }} />
            <Skeleton width={160} height={36} radius={6} />
          </div>
          <Skeleton width="100%" height={40} radius={8} />
        </div>
      )}

      {!loadingPreview && preview && (
        <div className="card" style={{ maxWidth: 520 }}>
          <div className="row spread" style={{ marginBottom: 16 }}>
            <h3 className="mt-0" style={{ margin: 0 }}>Link preview</h3>
            <span className={`link-status ${preview.status}`}>{preview.status}</span>
          </div>

          <div className="grid cols-2" style={{ marginBottom: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>From</div>
              <div>@{preview.creator?.username ?? '—'}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Created</div>
              <div>{formatDate(preview.created)}</div>
            </div>
          </div>

          <div style={{ marginBottom: preview.note ? 16 : 20 }}>
            <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Amount</div>
            <div className="balance-display" style={{ fontSize: '2rem' }}>{formatINR(preview.amount)}</div>
          </div>

          {preview.note && (
            <div style={{ marginBottom: 20 }}>
              <div className="muted" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Note</div>
              <div style={{
                background: 'var(--surface-2, var(--bg))',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 14px',
                fontStyle: 'italic',
                color: 'var(--muted)',
              }}>
                "{preview.note}"
              </div>
            </div>
          )}

          <button onClick={handleClaim} disabled={claiming} style={{ width: '100%' }}>
            {claiming ? <><span className="spinner" /> Claiming...</> : `Claim ${formatINR(preview.amount)}`}
          </button>
        </div>
      )}

    </>
  );
}
