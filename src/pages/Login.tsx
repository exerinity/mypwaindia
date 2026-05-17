import { useState, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { describeError } from '../utils/errors.js';
import { Logo } from '../components/Logo.jsx';
import { ArrowLeftIcon, ExternalIcon } from '../components/Icons.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function LoginPage() {
  usePageTitle('Log in');
  const { login, accounts, maxAccounts } = useAuth();
  const { update: updateSettings } = useSettings();
  const location = useLocation();
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const envRef = useRef('production');

  const atCapacity = accounts.length >= maxAccounts;

  async function handleSubmit(e) {
    e.preventDefault();
    if (atCapacity) {
      toast.error(`You have too many accounts logged in! (${maxAccounts} max)`);
      return;
    }
    const env = envRef.current;
    envRef.current = 'production';
    setBusy(true);
    setError(null);
    try {
      const dest = location.state?.from?.pathname || '/dash';
      await login({ username, password, totp_code: totp || undefined, env }, dest);
    } catch (e) {
      if (e.code === 1002) {
        setNeeds2fa(true);
        setError({ message: 'Enter your 2FA code...' });
      } else if (e.code === 1010) {
        setError({ message: 'That 2FA code did not work. Be quick now...' });
      } else {
        setError({ message: describeError(e) });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h2 className="mt-0">Log in to MyPayIndia</h2>

        {atCapacity && (
          <div className="alert alert-warning">
            You have {maxAccounts} accounts saved on this device. Remove one before adding another.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              if (busy || atCapacity) return;
              updateSettings({ scambait: true });
              e.currentTarget.requestSubmit();
            }
          }}
        >
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
            style={{ width: '100%', marginTop: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (busy || atCapacity) return;
              envRef.current = 'staging';
              e.currentTarget.form.requestSubmit();
            }}
          >
            {busy ? <><span className="spinner" /> Logging in...</> : <>Log in</>}
          </button>
          <a
            href="https://mypayindia.com/accountservices/register"
            target="_blank"
            rel="noreferrer"
            className="btn secondary"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
          >
            Sign up on the main website <ExternalIcon></ExternalIcon>
          </a>
          <a
            href="https://legacy.app.mypayindia.com/"
            target="_blank"
            rel="noreferrer"
            className="btn secondary"
            style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
          >
            Legacy web app <ExternalIcon></ExternalIcon>
          </a>
        </form>

        {accounts.length > 0 && (
          <div className="mt-2 center">
            <Link to="/dash" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ArrowLeftIcon /> Nope, I'm fine with what I have for now
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
