import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { getLink, claimLink } from '../api/links.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getUserInfo } from '../api/user.js';
import { formatINR } from '../utils/money.js';
import { formatDate } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { ErrorIcon } from '../components/icons.tsx';

export default function ClaimLinkPage() {
  usePageTitle('Claim a link');
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [preview, setPreview] = useState<{creator?:{username:string};amount:number;note?:string;created:string;status:string}|null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<unknown>(null);
  const [claiming, setClaiming] = useState(false);

  async function inspect(t?: string) {
    const trimmed = (t || token).trim();
    if (!trimmed) return;
    setLoadingPreview(true);
    setPreview(null);
    setPreviewError(null);
    try {
      const info = await getLink(trimmed) as {creator?:{username:string};amount:number;note?:string;created:string;status:string};
      setPreview(info);
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
    } catch { /* n */ }
    setToken(t);
  }

  async function handleClaim() {
    if (!token.trim()) return;
    setClaiming(true);
    try {
      const res = await claimLink(active!, token.trim()) as {transaction_id:string};
      toast.success('Link claimed!');
      try {
        const info = await getUserInfo(active!) as any;
        updateBalance(active!.id, info.balance);
      } catch { /* n */ }
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
      <div className="card" style={{ maxWidth: 560 }}>
        <label>Payment link or token</label>
        <input
          type="text"
          value={token}
          onChange={(e) => handleTokenChange(e.target.value)}
          disabled={claiming}
        />
        <div className="row">
          <button className="secondary" onClick={() => inspect()} disabled={!token.trim() || loadingPreview}>
            {loadingPreview ? 'Looking...' : 'Inspect'}
          </button>
        </div>

        {previewError != null && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ErrorIcon /><span>{describeError(previewError)}</span></div>
        )}

        {preview && (
          <div className="card mt-2" style={{ background: 'var(--bg-elev)' }}>
            <p className="muted mt-0" style={{ fontSize: '0.8rem' }}>From</p>
            <h3 className="mt-0">@{preview.creator?.username}</h3>
            <div className="balance-display">{formatINR(preview.amount)}</div>
            {preview.note && <p className="muted">"{preview.note}"</p>}
            <p className="muted" style={{ fontSize: '0.8rem' }}>Created {formatDate(preview.created)}</p>
            <button onClick={handleClaim} disabled={claiming}>
              {claiming ? <><span className="spinner" /> Claiming...</> : 'Claim funds'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}