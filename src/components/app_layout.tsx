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

  const updateToastShown = useRef(false);
  const { needRefresh: [needRefresh] } = useRegisterSW();

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true;
      toast.push('A new version is available, refresh to update', 'info', 0, {
        label: 'Refresh',
        onClick: async () => {
          try {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
          } finally {
            window.location.reload();
          }
        },
      });
    }
  }, [needRefresh, toast]);

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
      {!isOnline && (
        <div className="verification-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <WarningIcon /> You are offline. To do most things, you need to be connected to the internet. <Link to="/i/flow/connection" className="link">Diagnose...</Link>
        </div>
      )}
      <div className="mpi-body">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="mpi-main">
          <div className="content-wrap">
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
