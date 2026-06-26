import { ContentSkeleton } from '../components/app_skeleton.tsx';
import React, { useState, useId, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { useApiCall } from '../hooks/api_call.js';
import { useCachedQuery } from '../hooks/cached_query.js';
import { transfer, listTransactions } from '../api/transactions.js';
import { getUserInfo } from '../api/user.js';
import type { Transaction } from '../components/tx_table.tsx';
import { useCurrency } from '../context/settings_ctx.tsx';
import { InfoIcon, WarningIcon, CloseIcon } from '../components/icons.tsx';
import { Modal } from '../components/modal.tsx';

const HoldButton = lazy(() => import('../components/hold_btn.tsx').then((m) => ({ default: m.HoldButton })));
const FloatingInput = lazy(() => import('../components/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));
const FloatingTextarea = lazy(() => import('../components/floating_input.tsx').then((m) => ({ default: m.FloatingTextarea })));
import { Skeleton } from '../components/status.tsx';
import { Link } from 'react-router-dom';

const PRESETS_PAISA = [
  100,    // 1
  500,    // 5
  1000,   // 10
  5000,   // 50
  10000,  // 100
  50000,  // 500
  100000, // 1,000
];

interface QueueItem {
  id: string;
  recipient: string;
  amountPaisa: number;
  note: string;
}

type ItemStatus = 'pending' | 'sending' | 'done' | 'error';

export default function BulkTransferPage() {
  usePageTitle('Bulk transfer');
  const { active, updateBalance } = useAuth();

  const toast = useToast();
  const format = useCurrency();
  const uid = useId();

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

  const [recipient, setRecipient] = useState('');
  const [note, setNote] = useState('');
  const [stackPaisa, setStackPaisa] = useState(0);
  const [rawInput, setRawInput] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const [showSonModal, setShowSonModal] = useState(false);

  const [keepAmount, setKeepAmount] = useState(false);
  const [keepNote, setKeepNote] = useState(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [statuses, setStatuses] = useState<Record<string, ItemStatus>>({});
  const [sending, setSending] = useState(false);

  const balance = userQ.data?.balance ?? null;
  const overBalance = balance !== null && stackPaisa > balance;
  const totalPaisa = queue.reduce((s, t) => s + t.amountPaisa, 0);
  const allDone = queue.length > 0 && queue.every((t) => statuses[t.id] === 'done');
  const anyError = queue.some((t) => statuses[t.id] === 'error');
  const totalHighValue = queue.length > 3 || totalPaisa > 200000;

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

  function addToQueue() {
    if (stackPaisa <= 0 || !recipient.trim()) { setShowSonModal(true); toast.success('im crine son 😭😭😭😭😭'); return; }
    const item: QueueItem = {
      id: `${uid}-${Date.now()}-${Math.random()}`,
      recipient: recipient.trim(),
      amountPaisa: stackPaisa,
      note: note.trim(),
    };
    setQueue((q) => [...q, item]);
    if (!keepAmount) setStackPaisa(0);
    setRecipient('');
    if (!keepNote) setNote('');
  }

  function removeItem(id: string) {
    setQueue((q) => q.filter((t) => t.id !== id));
    setStatuses((s) => { const n = { ...s }; delete n[id]; return n; });
  }

  function setStatus(id: string, status: ItemStatus) {
    setStatuses((s) => ({ ...s, [id]: status }));
  }

  async function sendAll() {
    if (queue.length === 0 || sending) return;
    setSending(true);
    let doneCount = 0;
    for (const item of queue) {
      if (statuses[item.id] === 'done') { doneCount++; continue; }
      setStatus(item.id, 'sending');
      try {
        await transfer(active!, {
          recipient: item.recipient,
          amount: item.amountPaisa,
          note: item.note || undefined,
        }) as { transaction_id: string };
        setStatus(item.id, 'done');
        doneCount++;
      } catch (err) {
        setStatus(item.id, 'error');
        const { describeError } = await import('../utils/errors.js');
        toast.error(`${item.recipient}: ${describeError(err)}`);
      }
    }
    try {
      const info = await getUserInfo(active!) as { balance: number };
      updateBalance(active!.id, info.balance);
    } catch { }
    setSending(false);

    const errCount = queue.filter((t) => statuses[t.id] === 'error').length;
    if (doneCount > 0 && errCount === 0) {
      toast.success(`Sent ${doneCount} transfer${doneCount !== 1 ? 's' : ''}: ${format(totalPaisa)} total`);
    }
  }

  const canSend = queue.length > 0 && !sending && !allDone;

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <Modal open={showSonModal} onClose={() => setShowSonModal(false)} title="son 😭😭😭😭😭">
        <img src="https://cologne.exerinity.com/son.png" alt="" style={{ display: 'block', maxWidth: '100%' }} />
      </Modal>

      <h1 className="mt-0">Bulk transfer</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
        Changed your mind? <Link to="/account/transfer">Single transfer...</Link>
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
            disabled={sending}
            aria-label="Transfer amount"
          />
          <div className="preset-stack-row">
            {PRESETS_PAISA.map((p) => (
              <button key={p} type="button" className="secondary compact" onClick={() => bump(p)} disabled={sending}>
                +{format(p)}
              </button>
            ))}
            <button type="button" className="ghost compact" onClick={reset} disabled={sending || stackPaisa === 0}>
              Reset
            </button>
          </div>
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
          disabled={sending}
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
                  disabled={sending}
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
          disabled={sending}
          maxLength={200}
        />
        <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
          <label className="checkbox-row" style={{ padding: 0, marginBottom: 0, marginTop: 0, fontSize: '0.875rem', color: 'var(--fg)', cursor: 'pointer' }}>
            <input type="checkbox" checked={keepAmount} onChange={(e) => setKeepAmount(e.target.checked)} disabled={sending} />
            Keep amount
          </label>
          <label className="checkbox-row" style={{ padding: 0, marginBottom: 0, marginTop: 0, fontSize: '0.875rem', color: 'var(--fg)', cursor: 'pointer' }}>
            <input type="checkbox" checked={keepNote} onChange={(e) => setKeepNote(e.target.checked)} disabled={sending} />
            Keep note
          </label>
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="button" onClick={addToQueue} disabled={sending}>
            {stackPaisa > 0 ? `Add ${format(stackPaisa)} to queue` : 'Add to queue'}
          </button>
        </div>
      </div>

      {queue.length > 0 && (
        <div className="card mb-2">
          <h3 className="mt-0" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span>Queue ({queue.length})</span>
            <span className="muted" style={{ fontSize: '0.9rem', fontWeight: 400 }}>Total: {format(totalPaisa)}</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {queue.map((item) => {
              const status = statuses[item.id] ?? 'pending';
              return (
                <div
                  key={item.id}
                  className="card compact"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: status === 'done' ? 0.55 : 1 }}
                >
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong>{item.recipient}</strong>
                    <span>{format(item.amountPaisa)}</span>
                    {item.note && (
                      <span className="muted" style={{ fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {item.note}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {status === 'sending' && <span className="spinner" />}
                    {status === 'done' && <span style={{ color: 'var(--success, #4caf50)', fontSize: '0.85rem' }}>Sent</span>}
                    {status === 'error' && <span style={{ color: 'var(--danger, #e53935)', fontSize: '0.85rem' }}>Failed</span>}
                    {(status === 'pending' || status === 'error') && !sending && (
                      <button type="button" className="ghost compact" onClick={() => removeItem(item.id)} style={{ padding: '2px 8px' }}>
                        <CloseIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {totalHighValue ? (
              <HoldButton onConfirm={sendAll} disabled={!canSend} type="button">
                {sending ? <><span className="spinner" /> Sending...</> : allDone ? 'All sent' : `Send all ${format(totalPaisa)} (hold)`}
              </HoldButton>
            ) : (
              <button type="button" onClick={sendAll} disabled={!canSend}>
                {sending ? <><span className="spinner" /> Sending...</> : allDone ? 'All sent' : `Send all (${format(totalPaisa)})`}
              </button>
            )}
            {anyError && !sending && (
              <button type="button" className="secondary" onClick={sendAll}>Retry failed</button>
            )}
            {!sending && !allDone && (
              <button type="button" className="ghost" onClick={() => { setQueue([]); setStatuses({}); }}>
                Clear queue
              </button>
            )}
          </div>
        </div>
      )}
    </Suspense>
  );
}
