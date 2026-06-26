import { useState } from 'react';
import { verifyAppLock, type AppLockMethod } from '../utils/app_lock.ts';
import { AppLockInput } from './app_lock_input.tsx';
import { LockIcon, ErrorIcon } from './icons.tsx';

const METHOD_LABEL: Record<AppLockMethod, string> = {
  pin: 'PIN',
  pattern: 'pattern',
  password: 'password',
};

interface AppLockScreenProps {
  method: AppLockMethod;
  onUnlock: () => void;
}

export function AppLockScreen({ method, onUnlock }: AppLockScreenProps) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function submit() {
    if (!value || checking) return;
    setChecking(true);
    const ok = await verifyAppLock(value);
    setChecking(false);
    if (ok) {
      onUnlock();
    } else {
      setError(true);
      setValue('');
    }
  }

  return (
    <div className="app-lock-screen">
      <div className="app-lock-bg-icon"><LockIcon size={666} /></div>
      <div className="app-lock-card">
        <h2 className="mt-0">MyPayIndia is locked</h2>
        <p className="muted" style={{ marginTop: -4 }}>Enter your {METHOD_LABEL[method]} to continue</p>

        <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <AppLockInput method={method} value={value} onChange={(v) => { setValue(v); setError(false); }} autoFocus />

          {error && (
            <p className="alert alert-error" style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flexShrink: 0, display: 'flex' }}><ErrorIcon size={16} /></span>
              Wrong
            </p>
          )}

          <button type="submit" style={{ width: '100%', marginTop: 16 }} disabled={!value || checking}>
            {checking ? 'Checking...' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
}
