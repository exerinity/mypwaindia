import { ContentSkeleton } from '../components/app_skeleton.tsx';
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { useCachedQuery } from '../hooks/cached_query.js';
import { useRefreshTimer } from '../hooks/refresh_timer.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { listLinks, createLink, cancelLink } from '../api/links.js';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { WarningIcon } from '../components/icons.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';

const RefreshStatus = lazy(() => import('../components/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));
const FloatingInput = lazy(() => import('../components/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));
const ConfirmModal = lazy(() => import('../components/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
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
  const { active } = useAuth();
  const { settings } = useSettings();
  const { userInfo, refetchUserInfo } = useGlobalData();
  const toast = useToast();
  const moneyMod = useLazyModule(() => import('../utils/money.js'));
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const formatINR = (n: number) => moneyMod ? moneyMod.formatINR(n) : '...';
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';
  const [stackPaisa, setStackPaisa] = useState(0);
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);
  const [rawInput, setRawInput] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  interface Link { id: number; token: string; amount: number; status: string; url: string; note?: string; created: string }
  const [cancelTarget, setCancelTarget] = useState<Link | null>(null);
  const [showCancelAll, setShowCancelAll] = useState(false);
  const [cancelAllProgress, setCancelAllProgress] = useState<{ done: number; total: number } | null>(null);

  const linksQ = useCachedQuery<{ links: Link[] }>(
    active ? `links:${active.id}` : null,
    () => listLinks(active!) as Promise<{ links: Link[] }>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer(
    [linksQ.refetch, refetchUserInfo],
    { enabled: settings.autoRefresh && !!active }
  );

  const balance = userInfo?.balance ?? null;

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
      refetchUserInfo();
    } catch (e) {
      const { describeError } = await import('../utils/errors.js');
      toast.error(describeError(e));
    } finally {
      setCreating(false);
    }
  }

  async function doDeleteAllLinks() {
    const links = [...activeLinks];
    setCancelAllProgress({ done: 0, total: links.length });
    let cancelled = 0;
    for (let i = 0; i < links.length; i++) {
      try {
        await cancelLink(active!, links[i].token);
        cancelled++;
      } catch (e) {
        const { describeError } = await import('../utils/errors.js');
        toast.error(`failed to cancel ${links[i].token}: ${describeError(e)}`);
      }
      setCancelAllProgress({ done: i + 1, total: links.length });
      if (i < links.length - 1) await new Promise((r) => setTimeout(r, 500));
    }
    setCancelAllProgress(null);
    toast.success(`OK, all of your payment links were cancelled. (${cancelled} link${cancelled !== 1 ? 's' : ''} cancelled)`);
    linksQ.refetch();
    refetchUserInfo();
  }

  async function doCancelLink(token: string) {
    try {
      await cancelLink(active!, token);
      toast.success('OK, that link was cancelled.');
      linksQ.refetch();
      refetchUserInfo();
    } catch (e) {
      const { describeError } = await import('../utils/errors.js');
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
    <Suspense fallback={<ContentSkeleton />}>
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
          <FloatingInput
            id="link-note"
            label="Note (optional)"
            type="text"
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

      <div className="row" style={{ alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0 }}>Live payment links ({activeLinks.length})</h3>
        {activeLinks.length > 0 && (
          <button
            className="compact danger"
            onClick={() => setShowCancelAll(true)}
            disabled={!!cancelAllProgress}
          >
            {cancelAllProgress
              ? `Cancelling ${cancelAllProgress.done}/${cancelAllProgress.total}...`
              : 'Cancel all'}
          </button>
        )}
      </div>
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

      <h3 className="mt-3" style={{ marginBottom: '0.75rem' }}>Void payment links ({otherLinks.length})</h3>
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
      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />
      <ConfirmModal
        open={showCancelAll}
        onClose={() => setShowCancelAll(false)}
        onConfirm={() => { setShowCancelAll(false); doDeleteAllLinks(); }}
        title="Cancel all active links"
        message={`Cancel ${activeLinks.length} active link${activeLinks.length !== 1 ? 's' : ''} (consisting of ${formatINR(activeLinks.reduce((s, l) => s + l.amount, 0))})? All amounts will be refunded to your balance.`}
        confirmLabel="Cancel all"
      />
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
    </Suspense>
  );
}
