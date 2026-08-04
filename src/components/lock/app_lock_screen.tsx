import { lazy, Suspense, useState } from 'react';
import { verifyAppLock, setAppLock, disableAppLock, recordAppLockUnlock, minLength, type AppLockMethod } from '../../utils/app_lock.ts';
import { AppLockInput } from './app_lock_input.tsx';
import { LockIcon, EyeIcon, EyeOffIcon } from '../ui/icons.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';

const FloatingInput = lazy(() => import('../ui/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));

const METHOD_LABEL: Record<AppLockMethod, string> = {
  pin: 'PIN',
  pattern: 'pattern',
  password: 'password',
};

type Step = 'unlock' | 'rescueVerify' | 'rescueChoice' | 'rescueNew' | 'rescueConfirm';

interface AppLockScreenProps {
  method: AppLockMethod;
  onUnlock: () => void;
}

export function AppLockScreen({ method, onUnlock }: AppLockScreenProps) {
  const { active } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>('unlock');
  const [value, setValue] = useState('');
  const [checking, setChecking] = useState(false);

  const [accountPassword, setAccountPassword] = useState('');
  const [showAccountPassword, setShowAccountPassword] = useState(false);

  const [newMethod, setNewMethod] = useState<AppLockMethod>(method);
  const [newValue, setNewValue] = useState('');
  const [newConfirmValue, setNewConfirmValue] = useState('');

  async function submit() {
    if (!value || checking) return;
    setChecking(true);
    const ok = await verifyAppLock(value);
    setChecking(false);
    if (ok) {
      recordAppLockUnlock();
      onUnlock();
    } else {
      toast.error('Wrong');
      setValue('');
    }
  }

  function startRescue() {
    setAccountPassword('');
    setStep('rescueVerify');
  }

  function submitRescueVerify() {
    if (!active || !accountPassword) return;
    if (active.password && accountPassword === active.password) {
      setStep('rescueChoice');
    } else {
      toast.error("That account password isn't right.");
      setAccountPassword('');
    }
  }

  function turnOff() {
    disableAppLock();
    onUnlock();
  }

  function startSetNew() {
    setNewMethod(method);
    setNewValue('');
    setNewConfirmValue('');
    setStep('rescueNew');
  }

  function continueNew() {
    if (newValue.length < minLength(newMethod)) {
      toast.error(`Too short - use at least ${minLength(newMethod)} ${newMethod === 'pattern' ? 'points' : 'characters'}`);
      return;
    }
    setStep('rescueConfirm');
  }

  async function finishNew() {
    if (newConfirmValue !== newValue) {
      toast.error("That didn't match. Try confirming again.");
      setNewConfirmValue('');
      return;
    }
    await setAppLock(newMethod, newValue);
    recordAppLockUnlock();
    toast.success('App lock updated');
    onUnlock();
  }

  return (
    <div className="app-lock-screen">
      <div className="app-lock-bg-icon"><LockIcon size={666} /></div>
      <div className="app-lock-card">
        {step === 'unlock' && (
          <>
            <h2 className="mt-0">MyPayIndia is locked</h2>
            <p className="muted" style={{ marginTop: -4 }}>Enter your {METHOD_LABEL[method]} to continue</p>

            <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
              <AppLockInput method={method} value={value} onChange={setValue} autoFocus />

              <button type="submit" style={{ width: '100%', marginTop: 16 }} disabled={!value || checking}>
                {checking ? 'Checking...' : 'Unlock'}
              </button>
            </form>

            {active ? (
              <button type="button" className="ghost compact" style={{ marginTop: 14 }} onClick={startRescue}>
                Rescue
              </button>
            ) : null}
          </>
        )}

        {step === 'rescueVerify' && (
          <>
            <h2 className="mt-0">Confirmation required</h2>
            <p className="muted" style={{ marginTop: -4 }}>
              Enter the account password for <strong>{active?.username}</strong> to modify app lock
            </p>
            <form onSubmit={(e) => { e.preventDefault(); submitRescueVerify(); }}>
              <Suspense fallback={<div style={{ height: 52 }} />}>
                <FloatingInput
                  label="Account password"
                  type={showAccountPassword ? 'text' : 'password'}
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowAccountPassword((s) => !s)}
                      aria-label={showAccountPassword ? 'Hide password' : 'Show password'}
                      title={showAccountPassword ? 'Hide password' : 'Show password'}
                    >
                      {showAccountPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                    </button>
                  }
                />
              </Suspense>
              <div className="modal-actions">
                <button type="button" className="secondary" onClick={() => setStep('unlock')}>Back</button>
                <button type="submit" disabled={!accountPassword}>
                  Continue
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'rescueChoice' && (
          <>
            <h2 className="mt-0">Modify app lock</h2>
            <div className="btn-row" style={{ flexDirection: 'column', marginTop: 14 }}>
              <button type="button" onClick={startSetNew}>Set a new lock</button>
              <button type="button" className="secondary danger" onClick={turnOff}>Turn off app lock</button>
              <button type="button" className="secondary" onClick={() => setStep('rescueVerify')}>Back</button>
            </div>
          </>
        )}

        {step === 'rescueNew' && (
          <>
            <h2 className="mt-0">Choose your new {newMethod}</h2>
            <div className="btn-row" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              {(['pin', 'pattern', 'password'] as const).map((m) => (
                <button
                  key={m}
                  className={newMethod === m ? '' : 'secondary'}
                  onClick={() => { setNewMethod(m); setNewValue(''); }}
                  type="button"
                >
                  {METHOD_LABEL[m]}
                </button>
              ))}
            </div>
            <AppLockInput method={newMethod} value={newValue} onChange={setNewValue} autoFocus />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setStep('rescueChoice')}>Back</button>
              <button type="button" onClick={continueNew} disabled={!newValue}>Continue</button>
            </div>
          </>
        )}

        {step === 'rescueConfirm' && (
          <>
            <h2 className="mt-0">Confirm your new {newMethod}</h2>
            <AppLockInput method={newMethod} value={newConfirmValue} onChange={setNewConfirmValue} autoFocus />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => { setStep('rescueNew'); setNewConfirmValue(''); }}>Back</button>
              <button type="button" onClick={finishNew} disabled={!newConfirmValue}>Save</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
