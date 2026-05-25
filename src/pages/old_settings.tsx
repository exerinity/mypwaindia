import React, { useState } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import type { Settings } from '../context/settings_ctx.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { RELEASES } from './release_notes.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { normalizeHex } from '../utils/colors.js';
import { ConfirmModal } from '../components/confirm_modal.tsx';
import { Modal } from '../components/modal.tsx';
import { ArrowLeftIcon, ExternalIcon, LogoutIcon } from '../components/icons.tsx';
import { usePageTitle } from '../hooks/page_title.js';

const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Dark' },
];

export default function OldSettingsPage() {
  usePageTitle('Old settings');
  const { settings, update, reset } = useSettings();
  const { accounts, removeAccount, active } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [accentInput, setAccentInput] = useState(settings.accent);
  const [removeOneTarget, setRemoveOneTarget] = useState<Account | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [scambaitKnocks, setScambaitKnocks] = useState(0);
  const [scambaitConfirmOpen, setScambaitConfirmOpen] = useState(false);
  const [scambaitAlreadyOpen, setScambaitAlreadyOpen] = useState(false);

  function handleResetMiddleClick(e: React.MouseEvent) {
    if (e.button !== 1) return;
    e.preventDefault();
    if (settings.scambait) {
      setScambaitAlreadyOpen(true);
      return;
    }
    if (!active) {
      toast.warning('Log in to enable scambait mode');
      return;
    }
    const next = scambaitKnocks + 1;
    if (next >= 5) {
      setScambaitKnocks(0);
      setScambaitConfirmOpen(true);
    } else {
      setScambaitKnocks(next);
      const remaining = 5 - next;
      toast.info(`You hear a rumble! Knock ${remaining} more time${remaining === 1 ? '' : 's'}...`);
    }
  }

  function applyAccent(hex: string) {
    const norm = normalizeHex(hex);
    if (!norm) {
      toast.error('That\'s not a valid hex color');
      return;
    }
    update({ accent: norm });
    setAccentInput(norm);
  }

  return (
    <><h1 className="mt-0">Old settings</h1>

      <p className="muted">
        <Link to="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeftIcon /> Back to settings</Link>
      </p>

      <div className="card mb-2">
        <h3 className="mt-0">Appearance</h3>

        <label>Theme</label>
        <div className="btn-row">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={settings.theme === opt.value ? '' : 'secondary'}
              onClick={() => update({ theme: opt.value })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <label className="mt-2">Accent color</label>
        <div className="row gap-sm">
          <input
            type="color"
            value={normalizeHex(accentInput) || '#d03505'}
            onChange={(e) => applyAccent(e.target.value)}
          />
          <input
            type="text"
            value={accentInput}
            onChange={(e) => setAccentInput(e.target.value)}
            onBlur={() => applyAccent(accentInput)}
            placeholder="#d03505"
            style={{ maxWidth: 160 }}
          />
          <button className="secondary compact" onClick={() => applyAccent('#d03505')}>
            Default
          </button>
        </div>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Data</h3>
        <div className="checkbox-row">
          <input
            type="checkbox"
            id="auto-refresh"
            checked={settings.autoRefresh}
            onChange={(e) => update({ autoRefresh: e.target.checked })}
            disabled={!active}
          />
          <label htmlFor="auto-refresh" style={{ margin: 0 }}>
            Auto-refresh data (every 30 seconds)
          </label>
        </div>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Use for display</h3>
        <p className="muted" style={{ fontSize: '0.85rem' }}>What name to show in the pill, dashboard, and everywhere else</p>
        <div className="btn-row">
          {([
            { value: 'username', label: 'Username' },
            { value: 'first_name', label: 'First name' },
            { value: 'full_name', label: 'Full name' },
          ] as { value: Settings['displayName']; label: string }[]).map((opt) => (
            <button
              key={opt.value}
              className={settings.displayName === opt.value ? '' : 'secondary'}
              onClick={() => update({ displayName: opt.value })}
              disabled={!active}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card mb-2">
        <div className="row spread">
          <h3 className="mt-0">Saved accounts ({accounts.length})</h3>
          {accounts.length > 0 && (
            <button className="compact danger" onClick={() => setRemoveAllOpen(true)}>
              Remove all
            </button>
          )}
        </div>
        {accounts.length === 0 ? (
          <p className="muted">No accounts saved</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Who</th>
                  <th>What</th>
                  <th>Where</th>
                  <th>Status</th>
                  <th>Remove</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acc) => (
                  <tr key={acc.id}>
                    <td>{acc.username}</td>
                    <td className="muted">{acc.role}</td>
                    <td className="muted">{acc.env ?? 'production'}</td>
                    <td>
                      {active?.id === acc.id ? (
                        <span className="link-status active">current</span>
                      ) : (
                        <span className="muted">stored</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="compact"
                        onClick={() => setRemoveOneTarget(acc)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Reset</h3>
        <p className="muted">Restore default theme, accent, and refresh settings. Won&apos;t touch your accounts.</p>
        <button className="secondary" onClick={() => { reset(); setAccentInput('#d03505'); toast.info('Settings reset'); }} onAuxClick={handleResetMiddleClick}>
          Reset settings
        </button>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">More settings</h3>
        <p className="muted">You can only do so much here - log in to MyPayIndia to change your info, email, and even delete your account:</p>
        <a
          href="https://mypayindia.com/accountservices/accsettings"
          target="_blank"
          rel="noopener noreferrer"
          className="btn secondary"
        >
          More account settings
          <ExternalIcon />
        </a>
      </div>

      {active && (
        <div className="card">
          <h3 className="mt-0">Log out</h3>
          <button onClick={() => navigate('/i/flow/logout')} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LogoutIcon />
            Log out
          </button>
        </div>
      )}

      {!settings.scambait && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 24 }}>
          <Link to="/i/release_notes">v{RELEASES[0].version.toLocaleLowerCase()}</Link>
          {' - '}
          app by <a href="https://exerinity.com" target="_blank" rel="noopener noreferrer">exerinity</a> using MyPayIndia API v2
          {' - '}
          env: {window.location.hostname === 'app.mypayindia.com' ? 'production' : 'staging'}
          {' - '}
          <a href="https://legacy.app.mypayindia.com" target="_blank" rel="noopener noreferrer">legacy app</a>
          {' - '}
          <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer">go to MyPayIndia.com</a>
          {' - '}
          <Link to="/i/acknowledgements">acknowledgements</Link>
        </p>
      )}

      <ConfirmModal
        open={!!removeOneTarget}
        onClose={() => setRemoveOneTarget(null)}
        onConfirm={() => {
          if (removeOneTarget) removeAccount(removeOneTarget.id);
          setRemoveOneTarget(null);
        }}
        title="Remove account"
        message={`Remove ${removeOneTarget?.username || ''}?`}
        confirmLabel="Remove"
      />

      <ConfirmModal
        open={removeAllOpen}
        onClose={() => setRemoveAllOpen(false)}
        onConfirm={() => {
          accounts.map((a) => a.id).forEach((id) => removeAccount(id));
          setRemoveAllOpen(false);
          toast.info('All accounts cleared');
          navigate('/i/flow/login');
        }}
        title="Remove all accounts"
        message={`Do you really, really want to remove all ${accounts.length} saved account${accounts.length === 1 ? '' : 's'}?`}
        confirmLabel="Remove all"
        holdConfirm
      />

      <Modal
        open={scambaitAlreadyOpen}
        onClose={() => setScambaitAlreadyOpen(false)}
        title="This mode is already enabled"
        fullscreen
      >
        <div className="center">
          You already enabled this. Press <kbd>Ctrl+Alt+B</kbd> to disable it
        </div>
      </Modal>

      <ConfirmModal
        open={scambaitConfirmOpen}
        onClose={() => setScambaitConfirmOpen(false)}
        onConfirm={() => {
          update({
            scambait: true,
            ...(settings.displayName === 'username' ? { displayName: 'full_name' } : {}),
          });
          toast.info('Scambait mode on, have fun!');
          setScambaitConfirmOpen(false);
          navigate('/dash');
        }}
        title="Enable scambait mode?"
        danger={false}
        fullscreen
        confirmLabel="Continue"
        message={
          <p className="mt-0">
            You are about to enable scambait mode. Please read this properly so you know what you&apos;re walking into.<br /><br />Enabling scambait mode will transform the app into a more legitimate-looking app for... scambaiting. It hides certain unrealistic things a scammer may raise an eyebrow to and changes other things completely.
            <br /><br />
            If you do not intend on convincing phone scammers that you are attempting to use MyPayIndia for payments and having them connect to your computer nor are doing any scambaiting, you should leave this setting alone.
            And obviously, <strong>do not use this to actually scam people. The scammers this is intended for are asshole vultures that prey on vulnerable elderly people, don&apos;t be one of them.</strong>
            <br /><br />
            Once enabled, you will immediately be navigated back to the adjusted dashboard. You can disable scambait mode by pressing <kbd>Ctrl+Alt+B</kbd>. Continue?
          </p>
        }
      />
    </>
  );
}
