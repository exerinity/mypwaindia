import { useState, useRef } from 'react';
import { Modal } from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import { Logo } from './Logo.jsx';

export function AddAccountModal({ open, onClose }) {
  const { login, accounts, maxAccounts } = useAuth();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const envRef = useRef('production');

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

  async function handleSubmit(e) {
    e.preventDefault();
    if (atCapacity) {
      toast.error(`You're at ${maxAccounts} accounts. Drop one first!`);
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
      if (err.code === 1002) {
        setNeeds2fa(true);
        setError({ message: 'Enter your 2FA code' });
      } else if (err.code === 1010) {
        setError({ message: 'Incorrect 2FA code' });
      } else {
        setError({ message: describeError(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add account" fullscreen>
      <div>
        {atCapacity && (
          <div className="alert alert-warning">
            You have {maxAccounts} accounts saved. Remove one before adding another.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Username or email</label>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={busy}
          />
          <label>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
          {needs2fa && (
            <>
              <label>Two-factor code</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                value={totp}
                onChange={(e) => setTotp(e.target.value)}
                disabled={busy}
                placeholder="123456"
              />
            </>
          )}
          {error && <div className="alert alert-error">{error.message}</div>}
          <button
            type="submit"
            disabled={busy || atCapacity}
            style={{ width: '100%' }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (busy || atCapacity) return;
              envRef.current = 'staging';
              e.currentTarget.form.requestSubmit();
            }}
          >
            {busy ? <><span className="spinner" /> Signing in...</> : 'Add account'}
          </button>
        </form>
      </div>
    </Modal>
  );
}