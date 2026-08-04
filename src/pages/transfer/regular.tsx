import { ContentSkeleton } from '../../components/app_skeleton.tsx';
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useApiCall } from '../../hooks/api_call.js';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { transfer, listTransactions } from '../../api/transactions.js';
import { getUserInfo } from '../../api/user.js';
import { useCurrency } from '../../context/settings_ctx.tsx';
import { InfoIcon, WarningIcon } from '../../components/icons.tsx';
import { Modal } from '../../components/modal.tsx';

const HoldButton = lazy(() => import('../../components/hold_btn.tsx').then((m) => ({ default: m.HoldButton })));
const FloatingInput = lazy(() => import('../../components/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));
const FloatingTextarea = lazy(() => import('../../components/floating_input.tsx').then((m) => ({ default: m.FloatingTextarea })));
import { Skeleton } from '../../components/status.tsx';
import type { Transaction } from '../../components/tx_table.tsx';

const PRESETS_PAISA = [
  100,    // 1
  500,    // 5
  1000,   // 10
  5000,   // 50
  10000,  // 100
  50000,  // 500
  100000, // 1,000
];

const TRUNCATE: React.CSSProperties = {
  display: 'block',
  width: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

export default function TransferPage() {
  usePageTitle('Transfer funds');
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const format = useCurrency();
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const [searchParams] = useSearchParams();
  const [recipient, setRecipient] = useState(() => searchParams.get('to') ?? '');
  const [note, setNote] = useState(() => searchParams.get('message') ?? '');
  const [busy, setBusy] = useState(false);
  const [stackPaisa, setStackPaisa] = useState(() => {
    const amount = parseFloat(searchParams.get('amount') ?? '');
    return !isNaN(amount) && amount > 0 ? Math.round(amount * 100) : 0;
  });
  const [rawInput, setRawInput] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [showSonModal, setShowSonModal] = useState(false);
  const [showRecents, setShowRecents] = useState(false);
  const [recentSort, setRecentSort] = useState<'recent' | 'amount'>('recent');

  const userQ = useApiCall<{ balance: number }>(
    async () => {
      const info = await getUserInfo(active!) as { balance: number };
      updateBalance(active!.id, info.balance);
      return info;
    },
    [active?.token]
  );

  const txQ = useCachedQuery<{ transactions: Transaction[] }>(
    active ? `history-tx:${active.id}` : null,
    () => listTransactions(active!) as Promise<{ transactions: Transaction[] }>,
    [active?.token],
    { skip: !active }
  );

  const balance = userQ.data?.balance ?? null;
  const overBalance = balance !== null && stackPaisa > balance;
  const isHighValue = stackPaisa > 200000;

  const recentRecipients = useMemo(() => {
    const txs = txQ.data?.transactions ?? [];
    const seen = new Set<string>();
    const result: string[] = [];
    for (const tx of txs) {
      if (tx.sender?.id === active?.id && tx.recipient?.username) {
        const u = tx.recipient.username;
        if (!seen.has(u)) { seen.add(u); result.push(u); }
        if (result.length >= 5) break;
      }
    }
    return result;
  }, [txQ.data, active?.id]);

  const recentTransfers = useMemo(() => {
    const txs = txQ.data?.transactions ?? [];
    const seen = new Set<string>();
    const pool: Transaction[] = [];
    for (const tx of txs) {
      if (tx.status === 'cancelled') continue;
      if (tx.sender?.id !== active?.id || !tx.recipient?.username || tx.amount <= 0) continue;
      const key = `${tx.recipient.username}:${tx.amount}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(tx);
    }
    pool.sort((a, b) => recentSort === 'amount'
      ? b.amount - a.amount
      : new Date(b.created).getTime() - new Date(a.created).getTime());
    return pool.slice(0, 6);
  }, [txQ.data, active?.id, recentSort]);

  function reperform(tx: Transaction) {
    setRecipient(tx.recipient?.username ?? '');
    setStackPaisa(tx.amount);
    setNote(tx.note?.trim() ?? '');
    setShowRecents(false);
  }

  function bump(amt: number) { setStackPaisa((s) => s + amt); }
  function reset() { setStackPaisa(0); }

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

  async function doTransfer() {
    if (stackPaisa <= 0) { setShowSonModal(true); toast.success('im crine son 😭😭😭😭😭'); return; }
    if (!recipient.trim()) { setShowSonModal(true); toast.success('im crine son 😭😭😭😭😭'); return; }
    setBusy(true);
    try {
      const res = await transfer(active!, {
        recipient: recipient.trim(),
        amount: stackPaisa,
        note: note.trim() || undefined,
      }) as { transaction_id: string };
      toast.success(`Sent ${format(stackPaisa)} to ${recipient}`);
      try {
        const info = await getUserInfo(active!) as { balance: number };
        updateBalance(active!.id, info.balance);
      } catch { }
      navigate(`/i/flow/transaction/${res.transaction_id}`);
    } catch (err) {
      const { describeError } = await import('../../utils/errors.js');
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <Modal open={showSonModal} onClose={() => setShowSonModal(false)} title="son 😭😭😭😭😭">
        <img src="/i/exquisite_imagery/charlie_son.jpg" alt="" style={{ display: 'block', maxWidth: '100%' }} />
      </Modal>
      <Modal open={showRecents} onClose={() => setShowRecents(false)}>
        <div className="table-controls">
          <label>
            Sort by
            <select value={recentSort} onChange={(e) => setRecentSort(e.target.value as 'recent' | 'amount')}>
              <option value="recent">Most recent</option>
              <option value="amount">Highest amount</option>
            </select>
          </label>
        </div>
        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {recentTransfers.map((tx) => {
            const when = datesMod ? datesMod.formatRelative(tx.created) : '...';
            const note = tx.note?.trim();
            return (
              <button
                key={tx.id}
                type="button"
                className="option"
                onClick={() => reperform(tx)}
                disabled={busy}
                style={{ minWidth: 0 }}
              >
                <span className="option-label" style={TRUNCATE}>{format(tx.amount)} to {tx.recipient!.username}</span>
                <span className="option-desc" style={TRUNCATE}>{note ? `${note} (${when})` : when}</span>
              </button>
            );
          })}
        </div>
      </Modal>
      <h1 className="mt-0">Transfer funds</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        Sending to multiple people? <Link to="/account/transfer/bulk">Bulk transfer...</Link>
      </p>
      <div className="alert alert-info" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <InfoIcon /><span>Please note that transfers above a certain amount are subject to manual review by our team.</span>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Amount</h3>
        <div className="preset-stack">
          <input
            className="preset-stack-display"
            type="text"
            inputMode="decimal"
            value={editingAmount ? rawInput : format(stackPaisa)}
            onChange={(e) => setRawInput(e.target.value)}
            onFocus={handleAmountFocus}
            onBlur={handleAmountBlur}
            disabled={busy}
            aria-label="Transfer amount"
          />
          <div className="preset-stack-row">
            {PRESETS_PAISA.map((p) => (
              <button key={p} type="button" className="secondary compact" onClick={() => bump(p)} disabled={busy}>
                +{format(p)}
              </button>
            ))}
            <button type="button" className="ghost compact" onClick={reset} disabled={busy || stackPaisa === 0}>
              Reset
            </button>
          </div>
          {(txQ.loading || recentTransfers.length > 0) && (
            <div className="preset-stack-row">
              <button
                type="button"
                className="ghost"
                onClick={() => setShowRecents(true)}
                disabled={busy || txQ.loading}
              >
                {txQ.loading ? <><span className="spinner" /> Retrieving data...</> : 'Open recents'}
              </button>
            </div>
          )}
          {overBalance && (
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon /><span>That's more than you have ({format(balance)}). The server will reject it. I'm warning you in advance...</span>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Compose</h3>
        <FloatingInput
          label="Recipient"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          disabled={busy}
        />
        {txQ.loading ? (
          <>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 10, marginBottom: 6 }}>Recent recipients</div>
            <div className="preset-stack-row">
              {[72, 56, 88, 64].map((w, i) => (
                <Skeleton key={i} width={w} height={31} radius={10} />
              ))}
            </div>
          </>
        ) : recentRecipients.length > 0 && (
          <>
            <div className="muted" style={{ fontSize: '0.8rem', marginTop: 10, marginBottom: 6 }}>Recent recipients</div>
            <div className="preset-stack-row">
              {recentRecipients.map((u) => (
                <button
                  key={u}
                  type="button"
                  className={recipient === u ? 'compact' : 'secondary compact'}
                  onClick={() => setRecipient(recipient === u ? '' : u)}
                  disabled={busy}
                >
                  {u}
                </button>
              ))}
            </div>
          </>
        )}

        <FloatingTextarea
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={busy}
          maxLength={200}
        />

        <div style={{ marginTop: 8 }}>
          {isHighValue ? (
            <HoldButton onConfirm={doTransfer} disabled={busy} type="button">
              {busy ? <><span className="spinner" /> Sending...</> : `Send ${format(stackPaisa)} (hold)`}
            </HoldButton>
          ) : (
            <button type="button" onClick={doTransfer} disabled={busy}>
              {busy ? <><span className="spinner" /> Sending...</> : `Send ${stackPaisa > 0 ? format(stackPaisa) : ''}`}
            </button>
          )}
        </div>
      </div>
    </Suspense>
  );
}
