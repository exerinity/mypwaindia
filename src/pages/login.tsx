import React, { useState, useRef, useEffect } from 'react';
import type { Env } from '../api/client.js';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { describeError } from '../utils/errors.js';
import { storageGet, KEYS } from '../utils/storage.ts';
import { Logo } from '../components/logo.tsx';
import { ArrowLeftIcon, ExternalIcon, WarningIcon, ErrorIcon } from '../components/icons.tsx';
import { FloatingInput } from '../components/floating_input.tsx';
import { usePageTitle } from '../hooks/page_title.js';

export default function LoginPage() {
  usePageTitle('Log in to MyPayIndia');
  const { login, accounts, maxAccounts } = useAuth();
  const { update: updateSettings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);
  const [username, setUsername] = useState(searchParams.get('username') ?? '');
  const [password, setPassword] = useState(searchParams.get('password') ?? '');
  const [totp, setTotp] = useState('');
  const [needs2fa, setNeeds2fa] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stagingLogin, setStagingLogin] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);
  const envRef = useRef<Env>(searchParams.get('env') === 'staging' ? 'staging' : 'production');
  const formRef = useRef<HTMLFormElement>(null);

  const atCapacity = accounts.length >= maxAccounts;

  useEffect(() => {
    if (searchParams.get('username') && searchParams.get('password') && !searchParams.has('nologin')) {
      formRef.current?.requestSubmit();
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atCapacity) {
      toast.error(`You have too many accounts logged in! (${maxAccounts} max)`);
      return;
    }
    const env = envRef.current;
    envRef.current = 'production';
    setStagingLogin(false);
    const isScambait = searchParams.get('scambait') === 'true' || searchParams.get('s') === 'true';
    if (isScambait) updateSettings({ scambait: true, displayName: 'full_name' });
    setBusy(true);
    setError(null);
    try {
      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      const dest = from ? (from.pathname ?? '/dash') + (from.search ?? '') + (from.hash ?? '') : '/dash';
      const onboarded = storageGet<number>(KEYS.ONBOARD, 0) === 1;
      await login({ username, password, totp_code: totp || undefined, env }, onboarded || isScambait ? dest : '/i/flow/onboarding');
    } catch (e) {
      const err = e as { code?: number };
      if (err.code === 1002) {
        setNeeds2fa(true);
        setError({ message: 'Enter your 2FA code.' });
      } else if (err.code === 1010) {
        setError({ message: 'Incorrect 2FA code, try again.' });
      } else {
        setError({ message: describeError(e) });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={leaving ? 'page-slide-out' : 'page-slide-in'} onAnimationEnd={() => { if (leaving) { if ((window.history.state?.idx ?? 0) > 0) navigate(-1); else navigate('/dash'); } }} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h2 className="mt-0">Log in to MyPayIndia</h2>

        {atCapacity && (
          <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <WarningIcon /><span>Account limit at capacity</span>
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
              e.preventDefault();
              if (busy || atCapacity) return;
              updateSettings({ scambait: true, displayName: 'full_name' });
              e.currentTarget.requestSubmit();
            }
          }}
        >
          <FloatingInput
            label="Username or email"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={busy}
          />
          <FloatingInput
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={busy}
          />
          {needs2fa && (
            <FloatingInput
              label="Two-factor code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              disabled={busy}
            />
          )}
          {error && <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ErrorIcon /><span>{error.message}</span></div>}
          <button
            type="submit"
            title="TIP: right-click to log into the staging instance, Ctrl+Enter to immediately enable scambait mode when logging in"
            disabled={busy || atCapacity}
            style={{ width: '100%', marginTop: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onContextMenu={(e) => {
              e.preventDefault();
              if (busy || atCapacity) return;
              envRef.current = 'staging';
              setStagingLogin(true);
              e.currentTarget.form?.requestSubmit();
            }}
          >
            {busy ? <><span className="spinner" /> {stagingLogin ? 'Logging into staging...' : 'Logging in...'}</> : <>Log in</>}
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
        </form>

        <div className="mt-2 center">
          <button className="muted" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'inherit', font: 'inherit', padding: 0 }} onClick={() => setLeaving(true)}>
            <ArrowLeftIcon /> {accounts.length >= maxAccounts ? 'Go back and remove an account' : 'Nevermind, go back'}
          </button>
        </div>
      </div>
    </div>
  );
}
