import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { listLinks, createLink, cancelLink } from '../api/links.js';
import { getUserInfo } from '../api/user.js';
import { formatINR, rupeesToPaisa } from '../utils/money.js';
import { formatDate } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { WarningIcon } from '../components/icons.tsx';
import { ConfirmModal } from '../components/confirm_modal.tsx';
const PRESETS_PAISA = [
  100,    // 1 INR
  500,    // 5 INR
  1000,   // 10 INR
  5000,   // 50 INR
  10000,  // 100 INR
  50000,  // 500 INR
  100000, // 1,000 INR
];

export default function LinksPage() {
  usePageTitle('Payment links');
  const { active, updateBalance } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [stackPaisa, setStackPaisa] = useState(0);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  interface Link { id: number; token: string; amount: number; status: string; url: string; note?: string; created: string }
  const [cancelTarget, setCancelTarget] = useState<Link | null>(null);

  const linksQ = useApiCall<{ links: Link[] }>(
    () => listLinks(active!) as Promise<{ links: Link[] }>,
    [active?.token],
    { refresh: settings.autoRefresh }
  );

  const userQ = useApiCall<{ balance: number }>(
    async () => {
      const info = await getUserInfo(active!) as { balance: number };
      updateBalance(active!.id, info.balance);
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

  function bump(amt: number) { setStackPaisa((s) => s + amt); }
  function reset() { setStackPaisa(0); setNote(''); }

  function handleAmountFocus(e: React.FocusEvent<HTMLInputElement>) {
    const rupees = stackPaisa / 100;
    setRawInput(rupees === 0 ? '' : String(rupees));
    setEditingAmount(true);
    setTimeout(() => e.target.select(), 0);
  }
  function handleAmountBlur() {
    setEditingAmount(false);
    const rupees = parseFloat(rawInput);
    if (!isNaN(rupees) && rupees > 0) setStackPaisa(Math.round(rupees * 100));
    setRawInput('');
  }

  async function create() {
    if (stackPaisa <= 0) {
      toast.error('The amount should amount to something!');
      return;
    }
    if (balance !== null && stackPaisa > balance) {
      toast.error('I told you that you don\'t have that much!!!');
      return;
    }
    setCreating(true);
    try {
      const link = await createLink(active!, {
        amount: stackPaisa,
        note: note.trim() || undefined,
      }) as Link;
      toast.success(`Link created for ${formatINR(stackPaisa)}; copied to clipboard`);
      try {
        await navigator.clipboard.writeText(link.url);
      } catch {}
      reset();
      linksQ.refetch();
      try {
        const info = await getUserInfo(active!) as { balance: number };
        updateBalance(active!.id, info.balance);
      } catch {}
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setCreating(false);
    }
  }

  async function doCancelLink(token: string) {
    try {
      await cancelLink(active!, token);
      toast.success('OK, that link was cancelled.');
      linksQ.refetch();
      try {
        const info = await getUserInfo(active!) as { balance: number };
        updateBalance(active!.id, info.balance);
      } catch {}
    } catch (e) {
      toast.error(describeError(e));
    }
  }
  async function copyUrl(url: string) {
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
        <h3 className="mt-0">Compose a payment link</h3>
        <div className="preset-stack">
          <input
            className="preset-stack-display"
            type="text"
            inputMode="decimal"
            value={editingAmount ? rawInput : formatINR(stackPaisa)}
            onChange={(e) => setRawInput(e.target.value)}
            onFocus={handleAmountFocus}
            onBlur={handleAmountBlur}
            disabled={creating}
            aria-label="Payment amount"
          />
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
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon /><span>You don't have that much ({formatINR(balance)} available). The server will reject it. I'm warning you in advance...</span>
            </div>
          )}
        </div>
      </div>

      <h3>Live payment links ({activeLinks.length})</h3>
      {linksQ.loading && !linksQ.data ? (
        <div className="grid" style={{ gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card link-card compact">
              <div className="link-info">
                <div className="row gap-sm" style={{ marginBottom: 6 }}>
                  <Skeleton width={88} height={16} />
                  <Skeleton width={52} height={16} radius={999} />
                </div>
                <Skeleton width={`${140 + (i % 2) * 40}px`} height={11} style={{ marginBottom: 4 }} />
                <Skeleton width={200} height={10} />
              </div>
              <div className="row gap-sm">
                <Skeleton width={82} height={30} radius={6} />
                <Skeleton width={62} height={30} radius={6} />
              </div>
            </div>
          ))}
        </div>
      ) :
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

      <h3 className="mt-3">Void payment links ({otherLinks.length})</h3>
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
