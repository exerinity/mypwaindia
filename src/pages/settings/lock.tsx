import { useState } from 'react';
import { useToast } from '../../context/toast_ctx.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { WarningIcon, LockIcon } from '../../components/ui/icons.tsx';
import { AppLockInput } from '../../components/lock/app_lock_input.tsx';
import { getAppLockConfig, setAppLock, disableAppLock, verifyAppLock, minLength, setAppLockRequireAfter, REQUIRE_AFTER_OPTIONS } from '../../utils/app_lock.ts';
import type { AppLockMethod } from '../../utils/app_lock.ts';

export function LockSettings() {
  const toast = useToast();

  const [appLockConfig, setAppLockConfig] = useState(() => getAppLockConfig());
  const [appLockSetupOpen, setAppLockSetupOpen] = useState(false);
  const [appLockIntent, setAppLockIntent] = useState<'change' | 'disable' | 'requireAfter'>('change');
  const [appLockMethod, setAppLockMethod] = useState<AppLockMethod>('pin');
  const [appLockStep, setAppLockStep] = useState<'verify' | 'method' | 'enter' | 'confirm'>('method');
  const [appLockValue, setAppLockValue] = useState('');
  const [appLockConfirmValue, setAppLockConfirmValue] = useState('');
  const [appLockVerifyValue, setAppLockVerifyValue] = useState('');
  const [appLockVerifying, setAppLockVerifying] = useState(false);
  const [appLockPendingRequireAfter, setAppLockPendingRequireAfter] = useState(0);

  function openAppLockSetup() {
    setAppLockIntent('change');
    setAppLockMethod('pin');
    setAppLockValue('');
    setAppLockConfirmValue('');
    setAppLockVerifyValue('');
    setAppLockStep(appLockConfig?.enabled ? 'verify' : 'method');
    setAppLockSetupOpen(true);
  }

  function openAppLockDisable() {
    setAppLockIntent('disable');
    setAppLockVerifyValue('');
    setAppLockStep('verify');
    setAppLockSetupOpen(true);
  }

  function openAppLockRequireAfterVerify(ms: number) {
    setAppLockIntent('requireAfter');
    setAppLockPendingRequireAfter(ms);
    setAppLockVerifyValue('');
    setAppLockStep('verify');
    setAppLockSetupOpen(true);
  }

  async function appLockContinueFromVerify() {
    if (!appLockVerifyValue || appLockVerifying) return;
    setAppLockVerifying(true);
    const ok = await verifyAppLock(appLockVerifyValue);
    setAppLockVerifying(false);
    if (!ok) {
      toast.error("Incorrect");
      setAppLockVerifyValue('');
      return;
    }
    if (appLockIntent === 'disable') {
      disableAppLock();
      setAppLockConfig(null);
      setAppLockSetupOpen(false);
      toast.success('App lock turned off');
      return;
    }
    if (appLockIntent === 'requireAfter') {
      setAppLockRequireAfter(appLockPendingRequireAfter);
      setAppLockConfig(getAppLockConfig());
      setAppLockSetupOpen(false);
      toast.success('Updated');
      return;
    }
    setAppLockStep('method');
  }

  function appLockContinueFromEnter() {
    if (appLockValue.length < minLength(appLockMethod)) {
      toast.error(`Too short - use at least ${minLength(appLockMethod)} ${appLockMethod === 'pattern' ? 'points' : 'characters'}`);
      return;
    }
    setAppLockStep('confirm');
  }

  async function appLockFinishConfirm() {
    if (appLockConfirmValue !== appLockValue) {
      toast.error("That didn't match. Try confirming again.");
      setAppLockConfirmValue('');
      return;
    }
    await setAppLock(appLockMethod, appLockValue);
    setAppLockConfig(getAppLockConfig());
    setAppLockSetupOpen(false);
    toast.success('App lock on');
  }

  return (
    <>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        Require a PIN, pattern, or password before the app opens
      </p>

      <div className="alert alert-error" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}><WarningIcon /></span>
        <span>
          <strong>This is a local app lock</strong>, not extra account authentication. This is entirely client sided and can be disabled just by deleting the storage key.
        </span>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />

      {appLockConfig?.enabled ? (
        <>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <LockIcon /> App lock is on ({appLockConfig.method})
            </span>
          </div>

          <label htmlFor="app-lock-require-after" style={{ display: 'block', marginTop: 16 }}>Require after</label>
          <div className="row gap-sm" style={{ marginTop: 6 }}>
            <select
              id="app-lock-require-after"
              value={appLockConfig.requireAfterMs}
              onChange={(e) => openAppLockRequireAfterVerify(Number(e.target.value))}
            >
              {REQUIRE_AFTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="btn-row" style={{ marginTop: 14 }}>
            <button className="secondary" onClick={openAppLockSetup}>Change method</button>
            <button className="secondary danger" onClick={openAppLockDisable}>Turn off app lock</button>
          </div>
        </>
      ) : (
        <div className="btn-row">
          <button onClick={openAppLockSetup}>Set up app lock</button>
        </div>
      )}

      <Modal
        fullscreen
        className="slide"
        open={appLockSetupOpen}
        onClose={() => setAppLockSetupOpen(false)}
        bgIcon={<div className="app-lock-bg-icon"><LockIcon size={666} /></div>}
        title={
          appLockStep === 'verify'
            ? 'Confirmation required'
            : appLockStep === 'method'
              ? 'Set up app lock'
              : appLockStep === 'enter'
                ? `Choose your ${appLockMethod}`
                : `Confirm your ${appLockMethod}`
        }
      >
        {appLockStep === 'verify' && (
          <>
            <p className="mt-0 muted" style={{ fontSize: '0.9rem' }}>
              Enter your current {appLockConfig?.method} to{' '}
              {appLockIntent === 'disable' ? 'turn off app lock' : appLockIntent === 'requireAfter' ? 'change this setting' : 'change app lock'}
            </p>
            <AppLockInput
              method={appLockConfig?.method ?? 'pin'}
              value={appLockVerifyValue}
              onChange={setAppLockVerifyValue}
              autoFocus
            />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setAppLockSetupOpen(false)}>Cancel</button>
              <button
                type="button"
                className={appLockIntent === 'disable' ? 'danger' : undefined}
                onClick={appLockContinueFromVerify}
                disabled={!appLockVerifyValue || appLockVerifying}
              >
                {appLockVerifying ? 'Checking...' : appLockIntent === 'disable' ? 'Turn off' : 'Continue'}
              </button>
            </div>
          </>
        )}

        {appLockStep === 'method' && (
          <>
            <p className="mt-0 muted" style={{ fontSize: '0.9rem' }}>How do you want to unlock the app?</p>
            <div className="btn-row" style={{ flexWrap: 'wrap' }}>
              {(['pin', 'pattern', 'password'] as const).map((m) => (
                <button
                  key={m}
                  className={appLockMethod === m ? '' : 'secondary'}
                  onClick={() => setAppLockMethod(m)}
                >
                  {m === 'pin' ? 'PIN' : m === 'pattern' ? 'Pattern' : 'Password'}
                </button>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setAppLockSetupOpen(false)}>Cancel</button>
              <button type="button" onClick={() => setAppLockStep('enter')}>Continue</button>
            </div>
          </>
        )}

        {appLockStep === 'enter' && (
          <>
            <p className="mt-0 muted" style={{ fontSize: '0.9rem' }}>
              Enter your new {appLockMethod} (at least {minLength(appLockMethod)} {appLockMethod === 'pattern' ? 'points' : 'characters'})
            </p>
            <AppLockInput method={appLockMethod} value={appLockValue} onChange={setAppLockValue} autoFocus />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => setAppLockStep('method')}>Back</button>
              <button type="button" onClick={appLockContinueFromEnter} disabled={!appLockValue}>Continue</button>
            </div>
          </>
        )}

        {appLockStep === 'confirm' && (
          <>
            <p className="mt-0 muted" style={{ fontSize: '0.9rem' }}>Re-enter to confirm</p>
            <AppLockInput method={appLockMethod} value={appLockConfirmValue} onChange={setAppLockConfirmValue} autoFocus />
            <div className="modal-actions">
              <button type="button" className="secondary" onClick={() => { setAppLockStep('enter'); setAppLockConfirmValue(''); }}>Back</button>
              <button type="button" onClick={appLockFinishConfirm} disabled={!appLockConfirmValue}>Save</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
