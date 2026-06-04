import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Modal } from './modal.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { describeError } from '../utils/errors.js';
import { FloatingInput } from './floating_input.tsx';
import { WarningIcon, ErrorIcon, ChevronRight, ExternalIcon } from './icons.tsx';

interface AddAccountModalProps { open: boolean; onClose: () => void }

type Step = 'choice' | 'save-creds';

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const { accounts, active, maxAccounts, saveCredentials } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (open && !active?.token) {
      onClose();
      navigate('/i/flow/login');
    }
  }, [open]);

  const [step, setStep] = useState<Step>('choice');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const atCapacity = accounts.length >= maxAccounts;

  function reset() {
    setStep('choice');
    setUsername('');
    setPassword('');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      saveCredentials({ username: username.trim(), password });
      toast.success(`Credentials saved for ${username.trim()}`);
      handleClose();
    } catch (err) {
      setError(describeError(err));
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add account" className="slide">
      {step === 'choice' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {atCapacity && (
            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon /><span>You can only have {maxAccounts} accounts saved</span>
            </div>
          )}
          <button className="option" onClick={() => setStep('save-creds')} disabled={atCapacity} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className="option-label">Just save credentials</span>
              <span className="option-desc">for logging in later (not recommended)</span>
            </div>
            <ChevronRight />
          </button>
          {atCapacity ? (
            <button className="option" disabled style={{ flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="option-label">Log in</span>
                <span className="option-desc">through the full login flow (/i/flow/login)</span>
              </div>
              <ExternalIcon />
            </button>
          ) : (
            <Link to="/i/flow/login" className="option" onClick={handleClose} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className="option-label">Log in</span>
                <span className="option-desc">through the full login flow (/i/flow/login)</span>
              </div>
              <ExternalIcon />
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveCreds}>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.875rem' }}>
            These details will be saved but a session will not be initiated. You can switch to it any time in the account switcher and its information (like name and balance) will be populated
          </p>
          <FloatingInput
            label="Username or email"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <FloatingInput
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ErrorIcon /><span>{error}</span>
            </div>
          )}
          <div className="btn-row">
            <button type="button" className="secondary" onClick={() => { setError(null); setStep('choice'); }}>
              Back
            </button>
            <button type="submit">
              Save
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
