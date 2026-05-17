import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { transfer } from '../api/transactions.js';
import { getUserInfo } from '../api/user.js';
import { rupeesToPaisa } from '../utils/money.js';
import { useCurrency } from '../context/SettingsContext.tsx';
import { describeError } from '../utils/errors.js';

export default function TransferPage() {
  usePageTitle('Transfer funds');
  const { active, updateBalance } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const format = useCurrency();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const userQ = useApiCall<{ balance: number }>(
    async () => {
      const info = await getUserInfo(active!) as { balance: number };
      updateBalance(active!.id, info.balance);
      return info;
    },
    [active?.token]
  );

  const paisa = amount === '' ? 0 : rupeesToPaisa(amount);
  const validAmount = Number.isInteger(paisa) && paisa > 0;
  const balance = userQ.data?.balance ?? null;
  const overBalance = balance !== null && paisa > balance;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validAmount) {
      toast.error('Real numbers only!');
      return;
    }
    if (!recipient.trim()) {
      toast.error('Specify someone to send to');
      return;
    }
    setBusy(true);
    try {
      const res = await transfer(active!, {
        recipient: recipient.trim(),
        amount: paisa,
        note: note.trim() || undefined,
      }) as { transaction_id: string };
      toast.success(`${recipient} now has an extra ${format(paisa)}, thanks to you!`);
      try {
        const info = await getUserInfo(active!) as any;
        updateBalance(active!.id, info.balance);
      } catch {}
      navigate(`/i/transaction/${res.transaction_id}`);
    } catch (err) {
      toast.error(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <h1 className="mt-0">Transfer funds</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        <form onSubmit={handleSubmit}>
          <label>Recipient</label>
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={busy}
            required
          />

          <label>Amount</label>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
            placeholder="0.00"
            required
          />
          {amount && !Number.isInteger(paisa) && (
            <div className="alert alert-error">Too many decimals, space cadet!</div>
          )}
          {overBalance && (
            <div className="alert alert-warning">
              That's more than you have ({format(balance)}). The server will reject it. I'm warning you in advance...
            </div>
          )}

          <label>Note (optional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={busy}
            maxLength={200}
          />

          <button type="submit" disabled={busy || !validAmount || !recipient.trim()}>
            {busy ? <><span className="spinner" /> Sending...</> : `Send ${validAmount ? format(paisa) : ''}`}
          </button>
        </form>
      </div>
    </>
  );
}