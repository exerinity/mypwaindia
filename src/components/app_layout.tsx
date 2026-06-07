import { useState, useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Header } from './header.tsx';
import { Sidebar } from './sidebar.tsx';
import { VerificationBanner } from './verify_banner.tsx';
import { ConfirmModal } from './confirm_modal.tsx';
import { useGlobalAutoRefresh } from '../hooks/autorefresh.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { WarningIcon } from './icons.tsx';
import { storageGet, storageSet, KEYS } from '../utils/storage.ts';
import { RELEASES } from '../pages/release_notes.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { getRestrictions } from '../api/user.js';
import { getRestrictionInfo } from '../utils/restrictions.js';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [scambaitConfirmOpen, setScambaitConfirmOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  useGlobalAutoRefresh();

  type Restrictions = { restrictions: Record<string, { active: boolean }> };
  const restrictionsQ = useApiCall<Restrictions>(
    () => getRestrictions(active!) as Promise<Restrictions>,
    [active?.token],
    { refresh: settings.autoRefresh, skip: !active }
  );
  const restrictionList = Object.entries(restrictionsQ.data?.restrictions || {}).filter(([, v]) => v?.active);
  const fetchFailedCode = (restrictionsQ.error as { code?: number } | null)?.code;
  const fetchFailed = fetchFailedCode === -1 || fetchFailedCode === -2;
  const sessionExpired = fetchFailedCode === 1001;

  const updateToastShown = useRef(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  function syncLastVersion(announce: boolean) {
    const latest = RELEASES[0].version;
    const stored = storageGet<string | null>(KEYS.LAST_VERSION, null);
    if (stored === latest) return;
    if (announce && stored !== null) {
      const id = toast.push("MyPWAIndia has been updated - would you like to read what's new?", 'success', 0, {
        label: 'Go',
        onClick: () => {
          toast.remove(id);
          navigate('/i/release_notes');
        },
      }, () => {
        if (settings.autoUpdate) return;
        const hintId = toast.push('You can enable automatic updates in settings', 'info', 6000, {
          label: 'Show me...',
          onClick: () => {
            toast.remove(hintId);
            navigate('/settings/data');
          },
        });
      });
    }
    storageSet(KEYS.LAST_VERSION, latest);
  }

  useEffect(() => {
    syncLastVersion(true);
  }, []);

  function performUpdate() {
    toast.info('Updating, one moment...');
    syncLastVersion(false);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    updateServiceWorker(true);
  }

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true;
      if (settings.autoUpdate) {
        performUpdate();
      } else {
        const id = toast.push('A new version is available, would you like to reload?', 'info', 0, {
          label: 'Go',
          onClick: () => {
            toast.remove(id);
            performUpdate();
          },
        });
      }
    }
  }, [needRefresh, toast, settings.autoUpdate]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && e.key === 'b') {
        e.preventDefault();
        if (settings.scambait) {
          update({ scambait: false });
          toast.info('Scambait mode off');
        } else if (!active) {
          toast.warning('Log in to enable scambait mode');
        } else {
          setScambaitConfirmOpen(true);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settings.scambait, settings.displayName, update, toast, active]);

  function enableScambait() {
    update({
      scambait: true,
      ...(settings.displayName === 'username' ? { displayName: 'full_name' } : {}),
    });
    toast.info('Scambait mode on, have fun!');
    setScambaitConfirmOpen(false);
    navigate('/dash');
  }

  return (
    <div className="mpi-shell">
      <Header onToggleSidebar={() => setOpen((o) => !o)} />
      <VerificationBanner />
      {restrictionList.length > 0 && (
        <div className="verification-banner banner-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon />Your account has some active restrictions:{' '}
          {restrictionList.map(([k]) => getRestrictionInfo(k).title).join(', ')}.
          {' '}<Link to="/account/restrictions" className="link">More...</Link>
        </div>
      )}
      {active && !settings.scambait && storageGet<number>(KEYS.ONBOARD, 0) !== 1 && (
        <div className="verification-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /> Please read and accept the onboarding message. Once you do, this message will be hidden. <Link to="/i/flow/onboarding" className="link">Open...</Link>
        </div>
      )}
      {sessionExpired && (
        <div className="verification-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /> Your session has expired. Would you like to <Link to="/settings/sessions" className="link">reinitialize the session</Link>?
        </div>
      )}
      {fetchFailed && (
        <div className="verification-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /> Retrieving data failed: either the server did not respond or your session has expired. Data displayed may be out of date. <Link to="/i/flow/connection" className="link">Troubleshoot...</Link>
        </div>
      )}
      {!isOnline && (
        <div className="verification-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /> You are offline. To do most things, you need to be connected to the internet. <Link to="/i/flow/connection" className="link">Diagnose...</Link>
        </div>
      )}
      <div className="mpi-body">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="mpi-main">
          <div className="mpi-wrap">
            <Outlet />
          </div>
        </main>
      </div>

      <ConfirmModal
        open={scambaitConfirmOpen}
        onClose={() => setScambaitConfirmOpen(false)}
        onConfirm={enableScambait}
        title="Enable scambait mode?"
        danger={false}
        confirmLabel="Continue"
        message={
          <p className="mt-0">
            You are about to enable scambait mode. Please read this properly so you know what you're walking into.<br /><br />Enabling scambait mode will transform the app into a more legitimate-looking app for... scambaiting. It hides certain unrealistic things a scammer may raise an eyebrow to and changes other things completely.
            <br /><br />
            If you do not intend on convincing phone scammers that you are attempting to use MyPayIndia for payments and having them connect to your computer nor are doing any scambaiting, you should leave this setting alone.
            And obviously, <strong>do not use this to actually scam people. The scammers this is intended for are asshole vultures that prey on vulnerable elderly people, don't be one of them.</strong>
            <br /><br />
            Once enabled, you will immediately be navigated back to the adjusted dashboard. You can disable scambait mode by pressing <kbd>Ctrl+Alt+B</kbd>. Continue?
          </p>
        }
      />
    </div>
  );
}
