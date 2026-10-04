import { utility_classes } from '../../styles/utils.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Modal } from '../ui/modal.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { WarningIcon, ErrorIcon, ChevronRight, ExternalIcon } from '../ui/icons.tsx';

const FloatingInput = lazy(() => import('../ui/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));

interface AddAccountModalProps { open: boolean; onClose: () => void }

type Step = 'choice' | 'save-creds';

export function AddAccountModal({ open, onClose }: AddAccountModalProps) {
  const { accounts, active, maxAccounts, saveCredentials } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (open && !active?.token) {
      onClose();
      navigate('/i/flow/login', { state: { backgroundLocation: location } });
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

  async function handleSaveCreds(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      saveCredentials({ username: username.trim(), password });
      toast.success(`Credentials saved for ${username.trim()}`);
      handleClose();
    } catch (err) {
      const { describeError } = await import('../../utils/errors.js');
      setError(describeError(err));
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Add account" className="slide">
      <Suspense fallback={null}>
      {step === 'choice' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {atCapacity && (
            <div className={`alert alert-warning ${alert_classes.warning}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <WarningIcon /><span>You can only have {maxAccounts} accounts saved</span>
            </div>
          )}
          <button className={`option ${button_classes.option}`} onClick={() => setStep('save-creds')} disabled={atCapacity} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className={`option-label ${button_classes.option_label}`}>Just save credentials</span>
              <span className={`option-desc ${button_classes.option_desc}`}>for logging in later</span>
            </div>
            <ChevronRight />
          </button>
          {atCapacity ? (
            <button className={`option ${button_classes.option}`} disabled style={{ flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className={`option-label ${button_classes.option_label}`}>Log in</span>
                <span className={`option-desc ${button_classes.option_desc}`}>through the full login flow</span>
              </div>
              <ExternalIcon />
            </button>
          ) : (
            <Link to="/i/flow/login" state={{ backgroundLocation: location }} className={`option ${button_classes.option}`} onClick={handleClose} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span className={`option-label ${button_classes.option_label}`}>Log in</span>
                <span className={`option-desc ${button_classes.option_desc}`}>through the full login flow</span>
              </div>
              <ExternalIcon />
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={handleSaveCreds}>
          <p className={`muted ${utility_classes.muted}`} style={{ marginTop: 0, fontSize: '0.875rem' }}>
            These details will be saved but a session will not be initiated. You can switch to it any time in the account switcher and its information (like name and balance) will then be populated
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
            <div className={`alert alert-error ${alert_classes.error}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ErrorIcon /><span>{error}</span>
            </div>
          )}
          <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
            <button type="button" className="secondary" onClick={() => { setError(null); setStep('choice'); }}>
              Back
            </button>
            <button type="submit">
              Save
            </button>
          </div>
        </form>
      )}
      </Suspense>
    </Modal>
  );
}
