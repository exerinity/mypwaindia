import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Header } from './Header.jsx';
import { Sidebar } from './Sidebar.jsx';
import { VerificationBanner } from './VerificationBanner.jsx';
import { ConfirmModal } from './ConfirmModal.jsx';
import { useGlobalAutoRefresh } from '../hooks/useGlobalAutoRefresh.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const [scambaitConfirmOpen, setScambaitConfirmOpen] = useState(false);
  const { settings, update } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  useGlobalAutoRefresh();

  useEffect(() => {
    function handleKey(e) {
      if (e.ctrlKey && e.altKey && e.key === 'b') {
        e.preventDefault();
        if (settings.scambait) {
          update({ scambait: false });
          toast.info('Scambait mode off');
        } else {
          setScambaitConfirmOpen(true);
        }
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [settings.scambait, settings.displayName, update, toast]);

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
    <div className="app-shell">
      <Header onToggleSidebar={() => setOpen((o) => !o)} />
      <VerificationBanner />
      <div className="app-body">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <main className="app-main">
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
