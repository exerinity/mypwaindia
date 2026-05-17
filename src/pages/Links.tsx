import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { listLinks, createLink, cancelLink } from '../api/links.js';
import { getUserInfo } from '../api/user.js';
import { formatINR, rupeesToPaisa } from '../utils/money.js';
import { formatDate } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { LoadingRow, ErrorBox, Empty } from '../components/Status.jsx';
import { ConfirmModal } from '../components/ConfirmModal.jsx';
const PRESETS_PAISA = [
  100,    // ₹1
  500,    // ₹5
  1000,   // ₹10
  5000,   // ₹50
  10000,  // ₹100
  50000,  // ₹500
  100000, // ₹1,000
];

export default function LinksPage() {
  usePageTitle('Payment links');
  const { active, updateBalance } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [stackPaisa, setStackPaisa] = useState(0);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const linksQ = useApiCall(
    () => listLinks(active),
    [active?.token],
    { refresh: settings.autoRefresh }
  );

  const userQ = useApiCall(
    async () => {
      const info = await getUserInfo(active);
      updateBalance(active.id, info.balance);
      return info;
    },
    [active?.token],
    { refresh: settings.autoRefresh }
  );

  const balance = userQ.data?.balance ?? null;

  const { activeLinks, otherLinks } = useMemo(() => {
    const arr = linksQ.data?.links || [];
    return {
      activeLinks: arr.filter((l) => l.status === 'active'),
      otherLinks: arr.filter((l) => l.status !== 'active'),
    };
  }, [linksQ.data]);

  function bump(amt) { setStackPaisa((s) => s + amt); }
  function reset() { setStackPaisa(0); setNote(''); }

  async function create() {
    if (stackPaisa <= 0) {
      toast.error('The amount should amount to something!');
      return;
    }
    if (balance !== null && stackPaisa > balance) {
      toast.error('You don\'t have that much, but nice try.');
      return;
    }
    setCreating(true);
    try {
      const link = await createLink(active, {
        amount: stackPaisa,
        note: note.trim() || undefined,
      });
      toast.success(`Link created for ${formatINR(stackPaisa)}; copied to clipboard`);
      try {
        await navigator.clipboard.writeText(link.url);
      } catch {}
      reset();
      linksQ.refetch();
      try {
        const info = await getUserInfo(active);
        updateBalance(active.id, info.balance);
      } catch {}
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setCreating(false);
    }
  }

  async function doCancelLink(token) {
    try {
      await cancelLink(active, token);
      toast.success('OK, that link was cancelled.');
      linksQ.refetch();
      try {
        const info = await getUserInfo(active);
        updateBalance(active.id, info.balance);
      } catch {}
    } catch (e) {
      toast.error(describeError(e));
    }
  }
  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('OK');
    } catch {
      toast.error('Your browser refused');
    }
  }

  return (
    <>
      <h1 className="mt-0">Payment links</h1>

      <div className="card mb-2">
        <h3 className="mt-0">Create a new payment link</h3>
        <div className="preset-stack">
          <div className="preset-stack-display">
            {formatINR(stackPaisa)}
          </div>
          <div className="preset-stack-row">
            {PRESETS_PAISA.map((p) => (
              <button key={p} type="button" className="secondary compact" onClick={() => bump(p)} disabled={creating}>
                +{formatINR(p)}
              </button>
            ))}
            <button type="button" className="ghost compact" onClick={reset} disabled={creating || stackPaisa === 0}>
              Reset
            </button>
          </div>
          <label htmlFor="link-note" style={{ marginTop: 12 }}>Note (optional)</label>
          <input
            id="link-note"
            type="text"
            placeholder="What's this for?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={creating}
            maxLength={120}
          />
          <div>
            <button onClick={create} disabled={creating || stackPaisa <= 0}>
              {creating ? <><span className="spinner" /> Creating payment link...</> : `Go `}
            </button>
          </div>
          {balance !== null && stackPaisa > balance && (
            <div className="alert alert-warning">
              You don't have that much lmao ({formatINR(balance)} available)
            </div>
          )}
        </div>
      </div>

      <h3>Active links ({activeLinks.length})</h3>
      {linksQ.loading && !linksQ.data ? <LoadingRow /> :
        linksQ.error ? <ErrorBox error={linksQ.error} /> :
          activeLinks.length === 0 ? <Empty>No active links. Create one above?</Empty> :
            <div className="grid" style={{ gap: 10 }}>
              {activeLinks.map((l) => (
                <div key={l.id} className="card link-card compact">
                  <div className="link-info">
                    <div className="row gap-sm">
                      <strong>{formatINR(l.amount)}</strong>
                      <span className="link-status active">active</span>
                    </div>
                    {l.note && <div className="muted">{l.note}</div>}
                    <div className="link-token">{l.token}</div>
                    <div className="muted" style={{ fontSize: '0.78rem' }}>{formatDate(l.created)}</div>
                  </div>
                  <div className="row gap-sm">
                    <button className="copy-btn" onClick={() => copyUrl(l.url)}>Copy URL</button>
                    <button className="compact danger" onClick={() => setCancelTarget(l)}>Cancel</button>
                  </div>
                </div>
              ))}
            </div>
      }

      <h3 className="mt-3">Past links ({otherLinks.length})</h3>
      {otherLinks.length === 0 ? <Empty>Nothing here yet...</Empty> :
        <div className="grid" style={{ gap: 10 }}>
          {otherLinks.map((l) => (
            <div key={l.id} className="card link-card compact">
              <div className="link-info">
                <div className="row gap-sm">
                  <strong>{formatINR(l.amount)}</strong>
                  <span className={`link-status ${l.status}`}>{l.status}</span>
                </div>
                {l.note && <div className="muted">{l.note}</div>}
                <div className="link-token">{l.token}</div>
                <div className="muted" style={{ fontSize: '0.78rem' }}>{formatDate(l.created)}</div>
              </div>
            </div>
          ))}
        </div>
      }
      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) doCancelLink(cancelTarget.token);
          setCancelTarget(null);
        }}
        title="Cancel payment link"
        message={cancelTarget ? `Cancel this ${cancelTarget.note ? `"${cancelTarget.note}" ` : ''}link? The amount will be refunded to your balance.` : ''}
        confirmLabel="Cancel link"
      />
    </>
  );
}
