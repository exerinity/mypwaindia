import React, { useState, useMemo } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import type { Settings } from '../context/settings_ctx.tsx';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AppFooter } from '../components/app_footer.tsx';
import { RELEASES } from './release_notes.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { normalizeHex } from '../utils/colors.js';
import { ConfirmModal } from '../components/confirm_modal.tsx';
import { Modal } from '../components/modal.tsx';
import { ExternalIcon, ArrowLeftIcon, ChevronRight, SearchIcon, InfoIcon, StopIcon, SuccessIcon } from '../components/icons.tsx';
import { usePageTitle } from '../hooks/page_title.js';


const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Dark' },
];

type CategoryId =
  | 'appearance'
  | 'data'
  | 'display'
  | 'accounts'
  | 'reset'
  | 'account'
  | 'scambait';

interface Category {
  id: string;
  label: string;
  desc: string;
  authRequired?: boolean;
  hideWhenScambait?: boolean;
  href?: string;
  to?: string;
}

const CATEGORIES: Category[] = [
  { id: 'appearance', label: 'Appearance', desc: 'Theme and accent color' },
  { id: 'data', label: 'Data & sync', desc: 'Auto-refresh and API settings' },
  { id: 'display', label: 'Display name', desc: 'How your name appears in the app' },
  { id: 'accounts', label: 'Saved accounts', desc: 'Manage your stored accounts' },
  { id: 'reset', label: 'Reset', desc: 'Restore default settings' },
  { id: 'account', label: 'Account management', desc: 'Manage your account on MyPayIndia.com' },
  { id: 'scambait', label: 'Scambait mode', desc: 'Configure fake-banking mode for scambaiting', hideWhenScambait: true },
  { id: 'old_settings', label: 'Old settings', desc: 'Legacy flat-card layout', to: '/settings/old' },
  { id: 'logout', label: 'Log out', desc: 'Sign out of this app', authRequired: true, to: '/i/flow/logout' },
  { id: 'mypayindia', label: 'MyPayIndia.com', desc: 'Visit the main website', href: 'https://mypayindia.com' },
];

export default function SettingsPage() {
  const { category } = useParams<{ category: string }>();
  const activeCategory = (
    CATEGORIES.find((c) => !c.href && c.id === category)?.id ?? 'appearance'
  ) as CategoryId;
  const activeCat = CATEGORIES.find((c) => !c.href && c.id === activeCategory)!;

  usePageTitle(activeCat.label);

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
  const [search, setSearch] = useState('');
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const visibleCategories = useMemo(() => {
    const q = search.toLowerCase().trim();
    return CATEGORIES.filter((c) => {
      if (c.authRequired && !active) return false;
      if (c.hideWhenScambait && settings.scambait) return false;
      if (!q) return true;
      return c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
    });
  }, [search, active, settings.scambait]);

  function handleScambaitToggle() {
    if (settings.scambait) {
      update({ scambait: false });
    } else if (!active) {
      toast.warning('Log in to enable scambait mode');
    } else {
      update({
        scambait: true,
        ...(settings.displayName === 'username' ? { displayName: 'full_name' } : {}),
      });
    }
  }

  function handleResetMiddleClick(e: React.MouseEvent) {
    if (e.button !== 1) return;
    e.preventDefault();
    if (settings.scambait) { setScambaitAlreadyOpen(true); return; }
    if (!active) { toast.warning('Log in to enable scambait mode'); return; }
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
    if (!norm) { toast.error("That's not a valid hex color"); return; }
    update({ accent: norm });
    setAccentInput(norm);
  }

  function renderDetail() {
    switch (activeCategory) {

      case 'appearance':
        return (
          <>
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
          </>
        );

      case 'data':
        return (
          <>
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
            <div className="checkbox-row" style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
              <input
                type="checkbox"
                id="auto-refresh-focused"
                checked={settings.autoRefreshOnlyWhenFocused}
                onChange={(e) => update({ autoRefreshOnlyWhenFocused: e.target.checked })}
                disabled={!active || !settings.autoRefresh}
              />
              <label htmlFor="auto-refresh-focused" style={{ margin: 0 }}>
                Only when focused
              </label>
            </div>
          </>
        );

      case 'display':
        return (
          <>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              What name to show in the pill, dashboard, and everywhere else.
            </p>
            <div className="btn-row">
              {(
                [
                  { value: 'username', label: 'Username' },
                  { value: 'first_name', label: 'First name' },
                  { value: 'full_name', label: 'Full name' },
                ] as { value: Settings['displayName']; label: string }[]
              ).map((opt) => (
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
          </>
        );

      case 'accounts':
        return (
          <>
            <div className="row spread" style={{ marginBottom: 14 }}>
              <span className="muted" style={{ fontSize: '0.9rem' }}>
                {accounts.length} saved
              </span>
              {accounts.length > 0 && (
                <button className="compact danger" onClick={() => setRemoveAllOpen(true)}>
                  Remove all
                </button>
              )}
            </div>
            {accounts.length === 0 ? (
              <p className="muted">No accounts saved.</p>
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
                          {active?.id === acc.id
                            ? <span className="link-status active">current</span>
                            : <span className="muted">stored</span>}
                        </td>
                        <td>
                          <button className="compact" onClick={() => setRemoveOneTarget(acc)}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        );

      case 'reset':
        return (
          <>
            <p className="muted" style={{ marginBottom: 20, marginTop: 0 }}>
              Restores everything to default settings. This will not log you out.
            </p>
            <button
              className="secondary"
              onClick={() => { reset(); setAccentInput('#d03505'); toast.info('Settings reset'); }}
              onAuxClick={handleResetMiddleClick}
            >
              Reset settings
            </button>
          </>
        );

      case 'account':
        return (
          <>
            <p className="muted" style={{ marginBottom: 20, marginTop: 0 }}>
              You can only do so much here — log in to MyPayIndia to change your info, email, and
              even delete your account:
            </p>
            <a
              href="https://mypayindia.com/accountservices/accsettings"
              target="_blank"
              rel="noopener noreferrer"
              className="btn secondary"
            >
              More account settings
              <ExternalIcon />
            </a>
          </>
        );

      case 'scambait':
        return (
          <>
            {!active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
                <InfoIcon />
                <span>To use scambait mode, <Link to="/i/flow/login">please log in</Link>.</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
              <InfoIcon />
              <span>When enabled, this setting will become hidden. Remember its path: <Link to="/settings/scambait">/settings/scambait</Link></span>
            </div>

            <div className="card mb-2">
              <h3 className="mt-0">What is scambait mode?</h3>
              <p className="mt-0">Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app — but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.</p>
            </div>

            <div className="card mb-2">
              <h3 className="mt-0">Okay, what does it do?</h3>
              <ul className="mt-0 mb-0">
                <li>Displays currency as USD ($) instead of INR</li>
                <li>Adds a fake Cards page with plausible card details</li>
                <li>Adds a fake Bank Statements page with realistic transaction history (1000 entries from 2017) — this page will override the actual transaction history</li>
                <li>Adjusts dashboard stats to look more convincing</li>
                <li>Switches the name display to your full name automatically</li>
                <li>Hides the payment links views &amp; meta pages (i.e. leaderboard, CLi, release notes, meet the team, etc.) that would look suspicious to a scammer</li>
              </ul>
              <p>Convincing, right?</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-error">
                <StopIcon />
                <span>This is meant to be used against malicious activity. <strong>Do not use this <em>for</em> malicious activity.</strong></span>
              </div>
            </div>

            <div className="card">
              <div className="row spread" style={{ alignItems: 'center' }}>
                <div>
                  <strong>Scambait mode</strong>
                  <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.875rem' }}>
                    {!active ? 'Log in to enable' : settings.scambait ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.scambait}
                    onChange={handleScambaitToggle}
                    disabled={!active}
                  />
                  <span className="toggle-track" />
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-success">
                <SuccessIcon />
                <span>You should create a bespoke account for actually scambaiting with a full convincing name, and not use your main account.</span>
              </div>
              <p className="mb-0">You can also enable scambait mode by:</p>
              <ul className="mt-0">
                <li>Pressing <strong>Ctrl+Alt+B</strong></li>
                <li>Running &quot;scambait&quot; in <Link to="/i/flow/mci">MyCLiIndia</Link></li>
                <li>Middle-clicking the <strong>Reset settings</strong> button 5 times</li>
                <li>Holding <strong>Ctrl+Enter</strong> when logging in</li>
              </ul>
            </div>
          </>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <div className="settings-layout">

        <div className={`settings-nav${mobileShowDetail ? ' settings-nav--hidden' : ''}`}>
          <div className="settings-nav-header">
            <h1>Settings</h1>
            <div className="settings-search">
              <span className="settings-search-icon"><SearchIcon /></span>
              <input
                type="search"
                placeholder="Search Settings"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="settings-nav-list">
            {visibleCategories.length === 0 && (
              <p style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                No results
              </p>
            )}
            {visibleCategories.map((cat) =>
              cat.href ? (
                <a
                  key={cat.id}
                  href={cat.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-nav-item"
                >
                  <span className="settings-nav-item-label">{cat.label}</span>
                  <span className="settings-nav-item-chevron"><ExternalIcon size={14} /></span>
                </a>
              ) : (
                <Link
                  key={cat.id}
                  to={cat.to ?? `/settings/${cat.id}`}
                  className={`settings-nav-item${!cat.to && activeCategory === cat.id ? ' active' : ''}`}
                  onClick={() => setMobileShowDetail(true)}
                >
                  <span className="settings-nav-item-label">{cat.label}</span>
                  <span className="settings-nav-item-chevron"><ChevronRight size={16} /></span>
                </Link>
              )
            )}
          </div>

          {!settings.scambait && (
            <div className="settings-nav-footer">
              <AppFooter version={RELEASES[0].version} />
            </div>
          )}
        </div>

        <div className={`settings-detail${mobileShowDetail ? ' settings-detail--visible' : ''}`}>
          <div className="settings-detail-header">
            <button
              className="settings-detail-back"
              onClick={() => setMobileShowDetail(false)}
              aria-label="Back to settings list"
            >
              <ArrowLeftIcon size={18} />
            </button>
            <span>{activeCat.label}</span>
          </div>

          <div className="settings-detail-scroll">
            <div className="settings-detail-content">
              {renderDetail()}
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!removeOneTarget}
        onClose={() => setRemoveOneTarget(null)}
        onConfirm={() => { if (removeOneTarget) removeAccount(removeOneTarget.id); setRemoveOneTarget(null); }}
        title="Remove this account?"
        message={<>Are you sure you want to remove <strong>{removeOneTarget?.username || ''}</strong>?{accounts.length === 1 ? ' This is your only saved account, so you will be completely logged out of the app.' : ' You will then be logged into the next available account.'}</>}
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
        confirmLabel="Remove all (hold)"
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
            You are about to enable scambait mode. Please read this properly so you know what
            you&apos;re walking into.<br /><br />
            Enabling scambait mode will transform the app into a more legitimate-looking app
            for... scambaiting. It hides certain unrealistic things a scammer may raise an eyebrow
            to and changes other things completely.
            <br /><br />
            If you do not intend on convincing phone scammers that you are attempting to use
            MyPayIndia for payments and having them connect to your computer nor are doing any
            scambaiting, you should leave this setting alone. And obviously,{' '}
            <strong>
              do not use this to actually scam people. The scammers this is intended for are asshole
              vultures that prey on vulnerable elderly people, don&apos;t be one of them.
            </strong>
            <br /><br />
            Once enabled, you will immediately be navigated back to the adjusted dashboard. You can
            disable scambait mode by pressing <kbd>Ctrl+Alt+B</kbd>. Continue?
          </p>
        }
      />
    </>
  );
}