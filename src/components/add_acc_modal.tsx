import React, { useState, useRef } from 'react';
import { Modal } from './modal.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { describeError } from '../utils/errors.js';
import { Logo } from './logo.tsx';
import { WarningIcon, ErrorIcon } from './icons.tsx';
import { FloatingInput } from './floating_input.tsx';
import type { Env } from '../api/client.js';

interface AddAccountModalProps { open: boolean; onClose: () => void }

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const { login, accounts, maxAccounts } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const envRef = useRef<Env>('production');

  const atCapacity = accounts.length >= maxAccounts;

  function reset() {
    setUsername(''); setPassword(''); setTotp('');
    setNeeds2fa(false); setError(null); setBusy(false);
    envRef.current = 'production';
  }

  function handleClose() {
    if (busy) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atCapacity) {
      toast.error(`You're at ${maxAccounts} accounts. That's too many - drop one first!`);
      return;
    }
    const env = envRef.current;
    envRef.current = 'production';
    setBusy(true);
    setError(null);
    try {
      const acc = await login({ username, password, totp_code: totp || undefined, env });
      toast.success(`Added ${acc.username}`);
      reset();
      onClose();
    } catch (err) {
      if ((err as { code?: number }).code === 1002) {
        setNeeds2fa(true);
        setError({ message: 'Enter your 2FA code' });
      } else if ((err as { code?: number }).code === 1010) {
        setError({ message: 'Incorrect 2FA code' });
      } else {
        setError({ message: describeError(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add account" fullscreen className="slide">
      <div>
        {atCapacity && (
          <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningIcon /><span>You have {maxAccounts} accounts saved. Remove one before adding another.</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <FloatingInput label="Username or email" type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required disabled={busy} />
          <FloatingInput label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={busy} />
          {needs2fa && (
            <FloatingInput label="Two-factor code" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" value={totp} onChange={(e) => setTotp(e.target.value)} disabled={busy} />
          )}
          {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ErrorIcon /><span>{error.message}</span></div>}
          <button
            type="submit"
            disabled={busy || atCapacity}
            style={{ width: '100%' }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (busy || atCapacity) return;
              envRef.current = 'staging';
              e.currentTarget.form?.requestSubmit();
            }}
          >
            {busy ? <><span className="spinner" /> Signing in...</> : 'Add account'}
          </button>
        </form>
      </div>
    </Modal>
  );
}
