import { ContentSkeleton } from '../components/app_skeleton.tsx';
import React, { useState, useMemo, useRef, lazy, Suspense } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import type { Settings } from '../context/settings_ctx.tsx';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { RELEASES } from './release_notes.tsx';
import { useSettings, CUSTOM_VAR_KEYS, HOME_PAGE_OPTIONS, DEFAULT_DASHBOARD_BUTTONS, DASHBOARD_BUTTON_STYLES } from '../context/settings_ctx.tsx';
import type { DashboardButtonStyle } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { login as apiLogin, logout as apiLogout } from '../api/auth.js';
import { useToast } from '../context/toast_ctx.tsx';
import { Modal } from '../components/modal.tsx';
import { ExternalIcon, ArrowLeftIcon, ChevronRight, InfoIcon, StopIcon, SuccessIcon, WarningIcon, ErrorIcon, BulbIcon, PlusIcon, CloseIcon, LockIcon } from '../components/icons.tsx';
import { getAppLockConfig, setAppLock, disableAppLock, verifyAppLock, minLength } from '../utils/app_lock.ts';
import type { AppLockMethod } from '../utils/app_lock.ts';
import { AppLockInput } from '../components/app_lock_input.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { useCachedQuery } from '../hooks/cached_query.js';
import { useRefreshTimer } from '../hooks/refresh_timer.js';
import { listSessions, invalidateSession } from '../api/user.js';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../components/status.tsx';

const AppFooter = lazy(() => import('../components/app_footer.tsx').then((m) => ({ default: m.AppFooter })));
const ConfirmModal = lazy(() => import('../components/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
const FloatingInput = lazy(() => import('../components/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));
const RefreshStatus = lazy(() => import('../components/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));
const AddAccountModal = lazy(() => import('../components/add_acc_modal.tsx').then((m) => ({ default: m.AddAccountModal })));
const HoldButton = lazy(() => import('../components/hold_btn.tsx').then((m) => ({ default: m.HoldButton })));
import { hideGet, hideSetValue } from '../utils/storage.ts';
import FlowNotFoundPage from './flow_not_found.tsx';


interface Session { id: string; device_info?: string; ip?: string; created_at: string; last_active: string; current?: boolean; invalidated?: boolean }

type SessionSortCol = 'device' | 'created' | 'last_active' | 'status';
const SESSION_COL_SORTS: Record<SessionSortCol, [string, string]> = {
  device: ['device_az', 'device_za'],
  created: ['created_desc', 'created_asc'],
  last_active: ['last_active_desc', 'last_active_asc'],
  status: ['status_active', 'status_invalidated'],
};

function SessionRow({ s, onTerminate, formatDate }: { s: Session; onTerminate: (s: Session) => void; formatDate: (d: string) => string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <tr key={s.id}>
      <td>{s.device_info || '-'}{s.current && <strong> (current)</strong>}</td>
      <td
        className="mono"
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        style={{
          filter: revealed ? 'none' : 'blur(6px)',
          transition: 'filter 0.25s',
          cursor: 'default',
          userSelect: 'none',
        }}
      >
        {s.ip}
      </td>
      <td>{formatDate(s.created_at)}</td>
      <td>{formatDate(s.last_active)}</td>
      <td>
        <span className={`link-status ${s.invalidated ? 'cancelled' : 'active'}`}>
          {s.invalidated ? 'terminated' : 'active'}
        </span>
      </td>
      <td>
        {!s.invalidated && !s.current && (
          <button className="compact danger" onClick={() => onTerminate(s)}>
            Terminate
          </button>
        )}
      </td>
    </tr>
  );
}

const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Dark' },
  { value: 'custom', label: 'Custom' },
];

type BuiltinTheme = 'light' | 'dim' | 'dark';
const THEME_DEFAULTS: Record<BuiltinTheme, Record<string, string>> = {
  light: {
    '--bg': '#ffffff', '--bg-elev': '#f7f7f7', '--fg': '#222', '--muted': '#666',
    '--border': '#ddd', '--card': '#f7f7f7', '--card-soft': '#ffffff', '--pill-bg': '#ededed',
    '--success': '#0a7d26', '--error': '#d03505', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#fafafa', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  dim: {
    '--bg': '#121212', '--bg-elev': '#1d1d1d', '--fg': '#eaeaea', '--muted': '#aaa',
    '--border': '#333', '--card': '#1d1d1d', '--card-soft': '#1e1e1e', '--pill-bg': '#232323',
    '--success': '#4de68f', '--error': '#ff6b6b', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#181818', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.6)',
  },
  dark: {
    '--bg': '#000000', '--bg-elev': '#0a0a0a', '--fg': '#f0f0f0', '--muted': '#aaa',
    '--border': '#222', '--card': '#0a0a0a', '--card-soft': '#111', '--pill-bg': '#111',
    '--success': '#4de68f', '--error': '#ff6b6b', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#050505', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.8)',
  },
};

const CUSTOM_THEME_VARS: { key: typeof CUSTOM_VAR_KEYS[number]; label: string; isColor: boolean }[] = [
  { key: '--bg', label: 'Background', isColor: true },
  { key: '--bg-elev', label: 'Elevated background', isColor: true },
  { key: '--fg', label: 'Foreground', isColor: true },
  { key: '--muted', label: 'Muted text', isColor: true },
  { key: '--border', label: 'Border', isColor: true },
  { key: '--card', label: 'Card', isColor: true },
  { key: '--card-soft', label: 'Card (soft)', isColor: true },
  { key: '--pill-bg', label: 'Pill background', isColor: true },
  { key: '--success', label: 'Success', isColor: true },
  { key: '--error', label: 'Error', isColor: true },
  { key: '--alert-success', label: 'Alert: success', isColor: true },
  { key: '--alert-error', label: 'Alert: error', isColor: true },
  { key: '--alert-info', label: 'Alert: info', isColor: true },
  { key: '--alert-warning', label: 'Alert: warning', isColor: true },
  { key: '--table-row-alt', label: 'Table row alt', isColor: true },
  { key: '--shadow', label: 'Shadow', isColor: false },
];

type CategoryId =
  | 'appearance'
  | 'home'
  | 'data'
  | 'port'
  | 'sw'
  | 'account'
  | 'scambait'
  | 'sessions'
  | 'lock';

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
  { id: 'home', label: 'Home screen', desc: 'Page shown when opening the app', hideWhenScambait: true },
  { id: 'data', label: 'Data control', desc: 'Edit saved accounts, API settings, and other small settings' },
  { id: 'lock', label: 'App lock', desc: 'Require a PIN, pattern, or password to open the app' },
  { id: 'port', label: 'Share settings', desc: 'Move your settings in or out', hideWhenScambait: true },
  { id: 'sw', label: 'Service worker', desc: 'Manage the service worker', hideWhenScambait: true },
  { id: 'scambait', label: 'Scambait mode', desc: '67', hideWhenScambait: true },
  { id: 'sessions', label: 'Sessions', desc: 'View and manage active login sessions', authRequired: true },
  { id: 'logout', label: 'Log out', desc: 'Log out of MyPWAIndia', authRequired: true, to: '/i/flow/logout' },
  { id: 'toys', label: 'Toys', desc: 'Poke around with UI components', to: '/i/flow/mpti', hideWhenScambait: true },
  { id: 'account', label: 'Account management', desc: 'Manage your account on MyPayIndia.com', href: 'https://mypayindia.com/accountservices/accsettings' },
  { id: 'mypayindia', label: 'MyPayIndia.com', desc: 'Visit the main website', href: 'https://mypayindia.com' },
];

export default function SettingsPage() {
  const { category } = useParams<{ category: string }>();
  const matchedCategory = CATEGORIES.find((c) => !c.href && c.id === category);
  const isUnknownCategory = !!category && !matchedCategory;
  const activeCategory = (matchedCategory?.id ?? 'appearance') as CategoryId;
  const activeCat = CATEGORIES.find((c) => !c.href && c.id === activeCategory)!;

  usePageTitle(activeCat.label + ' / Settings');

  const { settings, update, reset } = useSettings();
  const { accounts, removeAccount, active, updateAccountInfo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const colorsMod = useLazyModule(() => import('../utils/colors.js'));
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [accentInput, setAccentInput] = useState(settings.accent);
  const [removeOneTarget, setRemoveOneTarget] = useState<Account | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [reinitStage, setReinitStage] = useState<'logout' | 'sleeping' | 'login' | null>(null);
  const [reinit2faOpen, setReinit2faOpen] = useState(false);
  const [reinit2faCode, setReinit2faCode] = useState('');
  const [reinit2faError, setReinit2faError] = useState<string | null>(null);
  const [customHomeInput, setCustomHomeInput] = useState<string | null>(() =>
    HOME_PAGE_OPTIONS.some((o) => o.value === settings.homePage) ? null : settings.homePage
  );
  const [hideInstall, setHideInstall] = useState(() => hideGet('install'));
  const [hideSbshint, setHideSbshint] = useState(() => hideGet('sbshint'));
  const [hideClickers, setHideClickers] = useState(() => hideGet('clickers'));
  const [hideIotmWelcome, setHideIotmWelcome] = useState(() => hideGet('iotm_welcome'));

  const [deleteStorageConfirmOpen, setDeleteStorageConfirmOpen] = useState(false);
  const [deleteStorageDoneOpen, setDeleteStorageDoneOpen] = useState(false);
  const [scambaitKnocks, setScambaitKnocks] = useState(0);
  const [scambaitConfirmOpen, setScambaitConfirmOpen] = useState(false);
  const [scambaitAlreadyOpen, setScambaitAlreadyOpen] = useState(false);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const [sessionSort, setSessionSort] = useState('last_active_desc');
  const [killTarget, setKillTarget] = useState<Session | null>(null);
  const [terminateAllOpen, setTerminateAllOpen] = useState(false);
  const [terminateAllSteps, setTerminateAllSteps] = useState([false, false, false]);
  const terminateAllDone = terminateAllSteps.every(Boolean);
  const [terminatingProgress, setTerminatingProgress] = useState<{ current: number; total: number } | null>(null);
  const terminateStopRef = useRef(false);

  const [importJson, setImportJson] = useState('');

  const [appLockConfig, setAppLockConfig] = useState(() => getAppLockConfig());
  const [appLockSetupOpen, setAppLockSetupOpen] = useState(false);
  const [appLockIntent, setAppLockIntent] = useState<'change' | 'disable'>('change');
  const [appLockMethod, setAppLockMethod] = useState<AppLockMethod>('pin');
  const [appLockStep, setAppLockStep] = useState<'verify' | 'method' | 'enter' | 'confirm'>('method');
  const [appLockValue, setAppLockValue] = useState('');
  const [appLockConfirmValue, setAppLockConfirmValue] = useState('');
  const [appLockVerifyValue, setAppLockVerifyValue] = useState('');
  const [appLockVerifying, setAppLockVerifying] = useState(false);

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

  const sessionsQ = useCachedQuery<{ sessions: Session[] }>(
    active ? `sessions:${active.id}` : null,
    () => listSessions(active!) as Promise<{ sessions: Session[] }>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft: sessionsSecondsLeft, refreshNow: refreshSessionsNow } = useRefreshTimer(
    [sessionsQ.refetch],
    { enabled: settings.autoRefresh && !!active }
  );

  const sortedSessions = useMemo(() => {
    const arr = [...(sessionsQ.data?.sessions || [])];
    arr.sort((a, b) => {
      switch (sessionSort) {
        case 'device_az': return (a.device_info || '').localeCompare(b.device_info || '');
        case 'device_za': return (b.device_info || '').localeCompare(a.device_info || '');
        case 'created_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'last_active_asc': return new Date(a.last_active).getTime() - new Date(b.last_active).getTime();
        case 'last_active_desc': return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
        case 'status_active': return (a.invalidated ? 1 : 0) - (b.invalidated ? 1 : 0);
        case 'status_invalidated': return (b.invalidated ? 1 : 0) - (a.invalidated ? 1 : 0);
        default: return 0;
      }
    });
    return arr;
  }, [sessionsQ.data, sessionSort]);

  function toggleSessionCol(col: SessionSortCol) {
    const [first, second] = SESSION_COL_SORTS[col];
    setSessionSort(prev => prev === first ? second : first);
  }
  function sessionColIndicator(col: SessionSortCol) {
    const [first, second] = SESSION_COL_SORTS[col];
    if (sessionSort === first) return ' ↓';
    if (sessionSort === second) return ' ↑';
    return ' ↕';
  }

  async function performReinitLogin(totpCode?: string) {
    setReinitStage('login');
    try {
      const data = await apiLogin({ username: active!.username, password: active!.password!, totp_code: totpCode || undefined, env: active!.env }) as { user: { role: string; username: string }; session_id: string };
      updateAccountInfo(active!.id, { token: data.session_id, role: data.user.role, username: data.user.username });
      toast.success('Session reinitialized');
      setReinit2faOpen(false);
      setReinit2faCode('');
      setReinit2faError(null);
    } catch (e) {
      const err = e as { code?: number };
      if (err.code === 1002) {
        setReinit2faError(null);
        setReinit2faOpen(true);
      } else if (err.code === 1010) {
        setReinit2faError('Incorrect 2FA code, try again.');
        setReinit2faOpen(true);
      } else {
        const { describeError } = await import('../utils/errors.js');
        toast.error(describeError(e));
        setReinit2faOpen(false);
      }
    } finally {
      setReinitStage(null);
    }
  }

  async function doReinitializeSession() {
    if (!active?.password) return;
    setReinitStage('logout');
    try { await apiLogout(); } catch (_) { }
    setReinitStage('sleeping');
    await new Promise<void>((r) => setTimeout(r, 1000));
    await performReinitLogin();
  }

  async function doServerLogout() {
    const currentSession = sessionsQ.data?.sessions.find((s) => s.current);
    if (currentSession) {
      try { await invalidateSession(active!, currentSession.id); } catch (_) { }
    }
    try { await apiLogout(); } catch (_) { }
    toast.success('OK');
    sessionsQ.refetch();
  }

  async function submitReinit2fa() {
    await performReinitLogin(reinit2faCode);
  }

  async function doKillSession(id: string) {
    try {
      await invalidateSession(active!, id);
      toast.success('Session terminated');
      sessionsQ.refetch();
    } catch (e) {
      const { describeError } = await import('../utils/errors.js');
      toast.error(describeError(e));
    }
  }

  async function doTerminateAll() {
    const targets = (sessionsQ.data?.sessions ?? []).filter((s) => !s.invalidated && !s.current);
    setTerminateAllOpen(false);
    setTerminateAllSteps([false, false, false]);
    terminateStopRef.current = false;
    setTerminatingProgress({ current: 0, total: targets.length });
    let terminated = 0;
    for (let i = 0; i < targets.length; i++) {
      if (terminateStopRef.current) break;
      setTerminatingProgress({ current: i + 1, total: targets.length });
      try {
        await invalidateSession(active!, targets[i].id);
        terminated++;
      } catch (e) {
        const { describeError } = await import('../utils/errors.js');
        toast.error(describeError(e));
      }
      if (i < targets.length - 1 && !terminateStopRef.current) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    }
    setTerminatingProgress(null);
    toast.success(`Terminated ${terminated} session${terminated === 1 ? '' : 's'}`);
    sessionsQ.refetch();
  }

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((c) => {
      if (c.authRequired && !active) return false;
      if (c.hideWhenScambait && settings.scambait) return false;
      return true;
    });
  }, [active, settings.scambait]);

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

  async function getSwRegistration() {
    if (!('serviceWorker' in navigator)) return undefined;
    return navigator.serviceWorker.getRegistration();
  }

  async function handleDeleteSw() {
    const reg = await getSwRegistration();
    if (!reg) { toast.warning('No service worker is registered'); return; }
    await reg.unregister();
    toast.success('Service worker deleted');
  }

  async function handleDoNotRegisterSw() {
    update({ swEnabled: false });
    const reg = await getSwRegistration();
    if (reg) {
      await reg.unregister();
      toast.success('Service worker disabled and stopped');
    } else {
      toast.success('Service worker will not be registered');
    }
  }

  async function handleReloadSw() {
    const reg = await getSwRegistration();
    if (!reg) { toast.warning('No service worker is registered'); return; }
    await reg.update();
    toast.success('Checked for a service worker update');
  }

  async function handleSwToggle(e: React.ChangeEvent<HTMLInputElement>) {
    const enabled = e.target.checked;
    update({ swEnabled: enabled });
    if (!enabled) {
      const reg = await getSwRegistration();
      if (reg) await reg.unregister();
    } else {
      toast.success('The service worker will register when you reload the app');
    }
  }

  function renderDetail() {
    if (isUnknownCategory) return <FlowNotFoundPage />;

    switch (activeCategory) {

      case 'appearance':
        return (
          <>
            <h3 className="mt-0">Theme</h3><p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>Change the theme and accent color, or make your own</p>
            {!settings.scambait && (
              <div className="alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BulbIcon></BulbIcon><span>Try out the custom theme system!</span>
              </div>
            )}
            <label>Preset</label>
            <div className="btn-row">
              {THEME_OPTIONS.filter((opt) => !settings.scambait || opt.value !== 'custom').map((opt) => (
                <button
                  key={opt.value}
                  className={settings.theme === opt.value ? '' : 'secondary'}
                  onClick={() => {
                    if (opt.value === 'custom' && settings.theme !== 'custom') {
                      const base = THEME_DEFAULTS[settings.theme as BuiltinTheme] ?? THEME_DEFAULTS.dark;
                      update({ theme: 'custom', customTheme: base });
                    } else {
                      update({ theme: opt.value });
                    }
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {settings.theme === 'custom' && (
              <>
                <label className="mt-2">Seed from</label>
                <div className="btn-row">
                  {(['light', 'dim', 'dark'] as BuiltinTheme[]).map((t) => (
                    <button key={t} className="secondary compact"
                      onClick={() => update({ customTheme: THEME_DEFAULTS[t] })}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <label className="mt-2">Colors</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginTop: 6 }}>
                  {CUSTOM_THEME_VARS.filter((v) => v.isColor).map(({ key, label }) => {
                    const raw = settings.customTheme[key] ?? '';
                    const def = THEME_DEFAULTS.dark[key];
                    const isDefault = raw === def;
                    return (
                      <div key={key}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                        <div className="row gap-sm">
                          <input
                            type="color"
                            value={normalizeHex(raw) || '#000000'}
                            onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                          />
                          <input
                            type="text"
                            value={raw}
                            onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                            placeholder="#000000"
                            style={{ maxWidth: 88 }}
                          />
                          <button
                            className="secondary compact"
                            disabled={isDefault}
                            onClick={() => update({ customTheme: { ...settings.customTheme, [key]: def } })}
                            title={`Reset to default (based on Dark) (${def})`}
                          >↺</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {CUSTOM_THEME_VARS.filter((v) => !v.isColor).map(({ key, label }) => {
                  const def = THEME_DEFAULTS.dark[key];
                  const val = settings.customTheme[key] ?? '';
                  return (
                    <div key={key} style={{ marginTop: 14 }}>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                      <div className="row gap-sm">
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                          placeholder="0 2px 8px rgba(0, 0, 0, 0.8)"
                          style={{ maxWidth: 340 }}
                        />
                        <button
                          className="secondary compact"
                          disabled={val === def}
                          onClick={() => update({ customTheme: { ...settings.customTheme, [key]: def } })}
                          title={`Reset to default (based on Dark)`}
                        >↺</button>
                      </div>
                    </div>
                  );
                })}

                <label className="mt-2">Share</label>
                <div className="btn-row" style={{ marginTop: 4 }}>
                  <button className="secondary compact" onClick={() => {
                    const blob = new Blob([JSON.stringify(settings.customTheme, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'mpi_theme.json';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    Export file
                  </button>
                  <button className="secondary compact" onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,application/json';
                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        try {
                          const parsed = JSON.parse(e.target?.result as string);
                          if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
                            throw new Error();
                          const filtered = Object.fromEntries(
                            Object.entries(parsed).filter(([k, v]) => typeof k === 'string' && k.startsWith('--') && typeof v === 'string')
                          ) as Record<string, string>;
                          update({ customTheme: filtered });
                          toast.success('Theme imported');
                        } catch {
                          toast.error('Invalid theme');
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}>
                    Import file
                  </button>
                  <button className="secondary compact" onClick={() => {
                    const colorKeys = CUSTOM_VAR_KEYS.filter((k) => k !== '--shadow');
                    const colorsHex = colorKeys.map((k) => {
                      const norm = normalizeHex(settings.customTheme[k] ?? '');
                      return (norm ?? '#000000').slice(1);
                    }).join('');
                    const accentHex = (normalizeHex(settings.accent) ?? '#d03505').slice(1);
                    const url = `https://mypayindia.sbs/i/flow/theme?id=${colorsHex}${accentHex}`;
                    navigator.clipboard.writeText(url).then(
                      () => toast.success('The theme has been encoded into a link and copied to your clipboard!'),
                      () => toast.error('Copying failed, why not create a file?'),
                    );
                  }}>
                    Generate link
                  </button>
                </div>
              </>
            )}

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

            {!settings.scambait && (
              <>
                <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
                <h3 className="mt-0">Display name</h3>
                <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
                  Change how your name appears throughout the app
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
                {!active && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
                    <InfoIcon />
                    <span>To use this setting, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
                  </div>
                )}
              </>
            )}
          </>
        );

      case 'home': {
        const inCustomMode = customHomeInput !== null;
        const selectValue = inCustomMode ? '__custom__' : settings.homePage;
        const commitCustom = (val: string) => { if (val.trim()) update({ homePage: val.trim() }); };
        return (
          <>
            <h3 className="mt-0">Default page</h3>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              Change what page is loaded when you open the app
            </p>
            <label htmlFor="home-page-select">Home page</label>
            <div className="row gap-sm" style={{ marginTop: 6 }}>
              <select
                id="home-page-select"
                value={selectValue}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setCustomHomeInput('');
                  } else {
                    update({ homePage: e.target.value });
                    setCustomHomeInput(null);
                  }
                }}
              >
                {HOME_PAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                <option value="__custom__">Something else...</option>
              </select>
            </div>
            {inCustomMode && (
              <FloatingInput
                label="Where?"
                type="text"
                value={customHomeInput}
                autoFocus
                onChange={(e) => setCustomHomeInput(e.target.value)}
                onBlur={() => commitCustom(customHomeInput)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitCustom(customHomeInput); }}
                style={{ maxWidth: 240 }}
              />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
              <InfoIcon />
              <span>This will not execute if you visit a page, obviously</span>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">Speed dial</h3>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 12, marginTop: 0 }}>
              Customize the action buttons shown on your dashboard (up to 5)
            </p>
            {settings.dashboardButtons.map((btn, i) => (
              <div key={i} className="row gap-sm" style={{ marginTop: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                <select
                  value={btn.route}
                  style={{ flex: 1, minWidth: 0 }}
                  onChange={(e) => {
                    const next = [...settings.dashboardButtons];
                    next[i] = { ...next[i], route: e.target.value };
                    update({ dashboardButtons: next });
                  }}
                >
                  {HOME_PAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={btn.style}
                  style={{ width: 130, flexShrink: 0 }}
                  aria-label="Button style"
                  onChange={(e) => {
                    const next = [...settings.dashboardButtons];
                    next[i] = { ...next[i], style: e.target.value as DashboardButtonStyle };
                    update({ dashboardButtons: next });
                  }}
                >
                  {DASHBOARD_BUTTON_STYLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  className="btn ghost"
                  style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
                  aria-label="Remove button"
                  onClick={() => update({ dashboardButtons: settings.dashboardButtons.filter((_, j) => j !== i) })}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
            <div className="row gap-sm" style={{ marginTop: 10 }}>
              {settings.dashboardButtons.length < 5 && (
                <button
                  className="btn secondary row gap-sm"
                  onClick={() => update({ dashboardButtons: [...settings.dashboardButtons, { route: HOME_PAGE_OPTIONS[0].value, style: 'secondary' }] })}
                >
                  <PlusIcon size={16} /> Add button
                </button>
              )}
              <button
                className="btn ghost"
                onClick={() => update({ dashboardButtons: [...DEFAULT_DASHBOARD_BUTTONS] })}
              >
                Reset to defaults
              </button>
            </div>
          </>
        );
      }

      case 'port': {
        const applyJson = async (raw: string) => {
          const { parseSettingsExport, applySettingsImport } = await import('../utils/settings_io.ts');
          const parsed = parseSettingsExport(raw);
          if (!parsed) { toast.error('That is not correct JSON'); return; }
          applySettingsImport(parsed, update);
          toast.success('Settings imported');
          setImportJson('');
        };
        return (
          <>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              Export or import your settings. This can be done in 3 methods; the third is recommended. This is useful for having consistency across devices or showing someone else <i>exactly</i> how your app is configured
            </p>

            <h3 className="mt-0">Copy &amp; paste</h3>
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="secondary compact" onClick={async () => {
                const { collectSettingsExport } = await import('../utils/settings_io.ts');
                const json = JSON.stringify(collectSettingsExport(settings), null, 2);
                navigator.clipboard.writeText(json).then(
                  () => toast.success('Settings JSON copied to clipboard'),
                  () => toast.error('Copying failed, try exporting a file'),
                );
              }}>
                Copy settings in JSON
              </button>
            </div>
            <label htmlFor="settings-import-json" className="mt-2">Paste JSON to import</label>
            <textarea
              id="settings-import-json"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='{ "settings": { ... } }'
              style={{ marginTop: 6, minHeight: 120, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8rem' }}
            />
            <div className="btn-row" style={{ marginTop: 6 }}>
              <button className="secondary compact" disabled={!importJson.trim()} onClick={() => applyJson(importJson)}>
                Apply pasted JSON
              </button>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">JSON file</h3>
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="secondary compact" onClick={async () => {
                const { collectSettingsExport } = await import('../utils/settings_io.ts');
                const json = JSON.stringify(collectSettingsExport(settings), null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'mpi_settings.json';
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Export file
              </button>
              <button className="secondary compact" onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (e) => applyJson(e.target?.result as string);
                  reader.readAsText(file);
                };
                input.click();
              }}>
                Import file
              </button>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">Shareable link (recommended)</h3>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: 8 }}>
              With this, you are able to choose what incoming settings are applied before accepting
            </p>
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="secondary compact" onClick={async () => {
                const { collectSettingsExport, settingsToSearchParams } = await import('../utils/settings_io.ts');
                const url = `https://mypayindia.sbs/i/flow/settings?${settingsToSearchParams(collectSettingsExport(settings))}`;
                navigator.clipboard.writeText(url).then(
                  () => toast.success('Settings link copied to clipboard!'),
                  () => toast.error('Copying failed, why not export a file?'),
                );
              }}>
                Generate link
              </button>
            </div>
          </>
        );
      }

      case 'data':
        return (
          <>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>Manage your accounts, app data, and MyPayIndia account</p>
            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-2">Syncing</h3>
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
            <div className="checkbox-row" style={{ marginTop: '0.5rem' }}>
              <input
                type="checkbox"
                id="auto-update"
                checked={settings.autoUpdate}
                onChange={(e) => update({ autoUpdate: e.target.checked })}
              />
              <label htmlFor="auto-update" style={{ margin: 0 }}>
                Automatically update the app when a new version is available
              </label>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">Hide stuff</h3>
            <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              If you pressed hide on something, you can unhide it here. Or hide everything in one go</p>
            {(
              [
                { key: 'install', label: 'Install app pill', value: hideInstall, set: setHideInstall },
                { key: 'sbshint', label: 'Path shortcut tip on dashboard', value: hideSbshint, set: setHideSbshint },
                { key: 'clickers', label: 'Active clickers dot (the button)', value: hideClickers, set: setHideClickers },
                { key: 'iotm_welcome', label: 'Welcome message (the button)', value: hideIotmWelcome, set: setHideIotmWelcome },
              ] as const
            ).map(({ key, label, value, set }, i) => (
              <React.Fragment key={key}>
                {i > 0 && <hr style={{ margin: '0', border: 'none', borderTop: '1px solid var(--border)' }} />}
                <div className="row spread" style={{ alignItems: 'center', padding: '10px 0' }}>
                  <span style={{ fontSize: '0.9rem' }}>{label}</span>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) => { hideSetValue(key, e.target.checked); set(e.target.checked); }}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              </React.Fragment>
            ))}

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">Saved accounts</h3>
            <div className="row spread" style={{ marginBottom: 14, marginTop: 4 }}>
              <span className="muted" style={{ fontSize: '0.9rem' }}>
                {accounts.length} saved
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="compact" onClick={() => setAddAccountOpen(true)}>
                  Add account
                </button>
                {accounts.length > 0 && (
                  <button className="compact danger" onClick={() => setRemoveAllOpen(true)}>
                    Remove all
                  </button>
                )}
              </div>
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

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h2 className="mt-0">App data</h2>
            <div className="btn-row" style={{ marginTop: 4 }}>
              <button
                className="secondary"
                onClick={() => { reset(); setAccentInput('#d03505'); toast.info('Settings reset'); }}
                onAuxClick={handleResetMiddleClick}
              >
                Reset settings
              </button>
              <button
                className="secondary danger"
                onClick={() => setDeleteStorageConfirmOpen(true)}
              >
                Delete all storage
              </button>
            </div>
          </>
        );

      case 'lock':
        return (
          <>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              Require a PIN, pattern, or password before the app opens
            </p>

            <div className="alert alert-warning" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ flexShrink: 0, marginTop: 2, display: 'flex' }}><StopIcon /></span>
              <span>
                <strong>This is a novelty, not real security.</strong> This only hides the app's content behind a
                local screen - it does not encrypt anything, protect your MyPayIndia account, or stop anyone determined.
                It's easily bypassable by clearing the site storage.
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
          </>
        );

      case 'sw':
        return (
          <>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
              Manage the service worker. The service worker makes the app work offline and could speed up navigation, but it could also contribute to stale caches
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
              <InfoIcon />
              If you don't know what a service worker is, or are not experiencing any issues with updating/data, you should leave these settings alone.
            </div>

            {!('serviceWorker' in navigator) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
                <InfoIcon />
                <span>Your browser doesn't support service workers, so these settings won't do anything</span>
              </div>
            )}

            <div className="row spread" style={{ alignItems: 'center', padding: '10px 0' }}>
              <div>
                <strong>Use service worker</strong>
                <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.875rem' }}>
                  {settings.swEnabled ? 'Enabled' : 'Disabled (any active service worker will be stopped)'}
                </p>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.swEnabled}
                  onChange={handleSwToggle}
                />
                <span className="toggle-track" />
              </label>
            </div>

            <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
            <h3 className="mt-0">Actions</h3>

            <div className="btn-row" style={{ marginTop: 4 }}>
              <button className="secondary" onClick={handleReloadSw}>
                Reload service worker
              </button>
              <button className="secondary danger" onClick={handleDoNotRegisterSw}>
                Do not register service worker
              </button>
              <button className="secondary danger" onClick={handleDeleteSw}>
                Delete service worker
              </button>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>
              <strong>Reload</strong> checks for and installs an updated service worker<br></br>
              <strong>Do not register</strong> stops the active service worker and prevents it from
              registering again<br></br>
              <strong>Delete</strong> immediately unregisters and ends the active service worker
            </p>
          </>
        );

      case 'scambait':
        return (
          <>
            {!active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
                <InfoIcon />
                <span>To use scambait mode, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className={`alert ${settings.scambait ? 'alert-warning' : 'alert-info'}`}>
              {settings.scambait ? <WarningIcon /> : <InfoIcon />}
              {settings.scambait
                ? <span>This setting is now hidden. To disable it, come back to <Link to="/settings/scambait">/settings/scambait</Link>.</span>
                : <span>When enabled, this setting will become hidden. Remember its path: <Link to="/settings/scambait">/settings/scambait</Link></span>
              }
            </div>

            <div className="card mb-2">
              <h3 className="mt-0">What is scambait mode?</h3>
              <p className="mt-0">Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.</p>
            </div>

            <div className="card mb-2">
              <h3 className="mt-0">Okay, what does it do?</h3>
              <ul className="mt-0 mb-0">
                <li>Displays currency as USD ($) instead of INR</li>
                <li>Adds a fake Cards page with plausible card details</li>
                <li>Adds a fake Bank Statements page with realistic transaction history (1000 entries from 2017) - this page will override the actual transaction history</li>
                <li>Adjusts dashboard stats to look more convincing</li>
                <li>Switches the name display to your full name automatically</li>
                <li>Hides the payment links views &amp; meta pages (i.e. leaderboard, CLi, release notes, meet the team, etc.) that would look suspicious to a scammer</li>
              </ul>
              <p>Convincing, right?</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-error">
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

      case 'sessions':
        return (
          <>
            {!active && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
                <InfoIcon />
                <span>To view sessions, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
              </div>
            )}
            {active && (
              <>
                <h3 className="mt-0">Reinitialize session</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
                  {(sessionsQ.error as { code?: unknown })?.code === 1001
                    ? 'Your session has expired. Pressing Reinitialize session will tell the server to log you back in using the app saved credentials.'
                    : 'If something feels stuck or out of sync, you can tell bastion to log you out and back in using your saved credentials.'}
                </p>
                <div className="row spread" style={{ alignItems: 'center', marginBottom: 20 }}>
                  <button
                    className="compact"
                    disabled={!active.password || reinitStage !== null || reinit2faOpen}
                    onClick={doReinitializeSession}
                  >
                    {reinitStage === 'logout' && <><span className="spinner" /> Logging out...</>}
                    {reinitStage === 'sleeping' && <><span className="spinner" /> Waiting...</>}
                    {reinitStage === 'login' && <><span className="spinner" /> Logging in...</>}
                    {reinitStage === null && (reinit2faOpen ? 'Waiting for 2FA code...' : 'Reinitialize session')}
                  </button>
                  {!active.password && (
                    <span className="muted" style={{ fontSize: '0.85rem' }}>No saved password for this account, so this can't be done</span>
                  )}
                </div>
                <hr style={{ margin: '0 0 20px', borderColor: 'var(--border)' }} />
                <h3 className="mt-0">Server logout</h3>
                <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>This will tell the server to log you out, but it leaves the app alone. For debugging purposes only - this will break the app. You shouldn't do this. But you can.</p>
                <button className="compact danger" onClick={doServerLogout}>Kill me</button>
                <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
              </>
            )}

            {active && (sessionsQ.loading && !sessionsQ.data ? (
              <>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : undefined }}>
                    <Skeleton width={`${25 + (i % 3) * 8}%`} height={13} />
                    <Skeleton width={90} height={13} />
                    <Skeleton width={80} height={13} />
                    <Skeleton width={80} height={13} />
                    <Skeleton width={55} height={13} />
                  </div>
                ))}
              </>
            ) : sessionsQ.error ? <ErrorBox error={sessionsQ.error} /> : (
              <>
                <div className="row gap-sm" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
                  {(() => {
                    const total = sortedSessions.length;
                    const active = sortedSessions.filter((s) => !s.invalidated).length;
                    const terminated = sortedSessions.filter((s) => s.invalidated).length;
                    return (
                      <>
                        <span className="link-status active">{active} active</span>
                        <span className="link-status cancelled">{terminated} terminated</span>
                        <span className="muted" style={{ fontSize: '0.875rem', alignSelf: 'center' }}>{total} total</span>
                      </>
                    );
                  })()}
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th onClick={() => toggleSessionCol('device')} style={{ cursor: 'pointer' }}>Device{sessionColIndicator('device')}</th>
                        <th>IP</th>
                        <th onClick={() => toggleSessionCol('created')} style={{ cursor: 'pointer' }}>Created{sessionColIndicator('created')}</th>
                        <th onClick={() => toggleSessionCol('last_active')} style={{ cursor: 'pointer' }}>Last active{sessionColIndicator('last_active')}</th>
                        <th onClick={() => toggleSessionCol('status')} style={{ cursor: 'pointer' }}>Status{sessionColIndicator('status')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedSessions.map((s) => (
                        <SessionRow key={s.id} s={s} onTerminate={setKillTarget} formatDate={formatDate} />
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 16 }}>
                  <button
                    className="danger"
                    onClick={() => { setTerminateAllSteps([false, false, false]); setTerminateAllOpen(true); }}
                    disabled={sortedSessions.filter((s) => !s.invalidated && !s.current).length < 3}
                  >
                    Terminate all sessions
                  </button>
                </div>
                <RefreshStatus seconds={sessionsSecondsLeft} onRefresh={refreshSessionsNow} enabled={settings.autoRefresh} />
              </>
            ))}
          </>
        );

      default:
        return null;
    }
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <div className="mpi-settings-layout">

        <div className={`mpi-settings-nav${mobileShowDetail ? ' mpi-settings-nav--hidden' : ''}`}>
          <div className="mpi-settings-nav-header">
            <h1>Settings</h1>
          </div>

          <div className="mpi-settings-nav-list">
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
                  className="mpi-settings-nav-item"
                  title={cat.desc}
                >
                  <span className="mpi-settings-nav-item-label">{cat.label}</span>
                  <span className="mpi-settings-nav-item-chevron"><ExternalIcon size={14} /></span>
                </a>
              ) : (
                <Link
                  key={cat.id}
                  to={cat.to ?? `/settings/${cat.id}`}
                  className={`mpi-settings-nav-item${!cat.to && activeCategory === cat.id ? ' active' : ''}`}
                  title={cat.desc}
                  onClick={() => setMobileShowDetail(true)}
                >
                  <span className="mpi-settings-nav-item-label">{cat.label}</span>
                  <span className="mpi-settings-nav-item-chevron"><ChevronRight size={16} /></span>
                </Link>
              )
            )}
          </div>

          {!settings.scambait && (
            <div className="mpi-settings-nav-footer">
              <AppFooter version={RELEASES[0].version} />
            </div>
          )}
        </div>

        <div className={`mpi-settings-detail${mobileShowDetail ? ' mpi-settings-detail--visible' : ''}`}>
          <div className="mpi-settings-detail-header">
            <button
              className="mpi-settings-detail-back"
              onClick={() => setMobileShowDetail(false)}
              aria-label="Back to settings list"
            >
              <ArrowLeftIcon size={18} />
            </button>
            <span>{isUnknownCategory ? 'What' : activeCat.label}</span>
          </div>

          <div className="mpi-settings-detail-scroll">
            <div className="mpi-settings-detail-content">
              {renderDetail()}
            </div>
          </div>
        </div>
      </div>

      <AddAccountModal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} />

      <ConfirmModal
        open={!!removeOneTarget}
        onClose={() => setRemoveOneTarget(null)}
        onConfirm={() => { if (removeOneTarget) removeAccount(removeOneTarget.id); setRemoveOneTarget(null); }}
        title="Remove this account?"
        message={<>Are you sure you want to remove <strong>{removeOneTarget?.username || ''}</strong>?{accounts.length === 1 ? ' This is your only saved account, so you will be completely logged out of the app' : ' You will then be logged into the next available account'}</>}
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

      <ConfirmModal
        open={deleteStorageConfirmOpen}
        onClose={() => setDeleteStorageConfirmOpen(false)}
        onConfirm={() => {
          localStorage.clear();
          setDeleteStorageConfirmOpen(false);
          setDeleteStorageDoneOpen(true);
        }}
        title="Delete all storage?"
        confirmLabel="Delete all"
        message={<>This will delete all local keys, including credentials, your chosen theme, and onboarding status. In other words, it will clear <strong>absolutely everything</strong>. Continue?</>}
      />

      <ConfirmModal
        open={!!killTarget}
        onClose={() => setKillTarget(null)}
        onConfirm={() => {
          if (killTarget) doKillSession(killTarget.id);
          setKillTarget(null);
        }}
        title="Terminate session"
        message={killTarget && (
          <div>
            <p className="mt-0" style={{ color: 'var(--muted)' }}>
              This will immediately sign out and invalidate the following session:
            </p>
            <div style={{
              background: 'var(--surface-2, var(--bg))',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '16px',
              marginBottom: 20,
            }}>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Device</div>
                <div style={{ fontSize: '0.9rem' }}>{killTarget.device_info || '-'}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>IP address</div>
                <div className="mono" style={{ fontSize: '0.9rem' }}>{killTarget.ip}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Created</div>
                <div style={{ fontSize: '0.9rem' }}>{formatDate(killTarget.created_at)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Last active</div>
                <div style={{ fontSize: '0.9rem' }}>{formatDate(killTarget.last_active)}</div>
              </div>
            </div>
          </div>
        )}
        confirmLabel="Continue"
      />

      <Modal
        open={terminateAllOpen}
        onClose={() => setTerminateAllOpen(false)}
        title={`Terminate all ${sortedSessions.filter((s) => !s.invalidated && !s.current).length} sessions`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 0 }} className="alert alert-error">
          <ErrorIcon />
          <span>This is a destructive action - read this carefully</span>
        </div>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          You should only use this in extreme cases,
          like if your password has been leaked and multiple people have access to your account. In that case, you should first <a href="https://mypayindia.com/accountservices/accsettings" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>change your password <ExternalIcon size={12} /></a>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {([0, 1, 2] as const).map((i) => (
            <HoldButton
              key={i}
              className="danger"
              disabled={terminateAllSteps[i] || (i > 0 && !terminateAllSteps[i - 1])}
              onConfirm={() => setTerminateAllSteps((prev) => { const next = [...prev]; next[i] = true; return next; })}
              style={{ opacity: terminateAllSteps[i] ? 0.5 : undefined }}
            >
              {terminateAllSteps[i] ? `Step ${i + 1} confirmed` : `Hold to confirm (step ${i + 1})`}
            </HoldButton>
          ))}
        </div>
        {terminateAllDone && (
          <div className="modal-actions">
            <button className="secondary" onClick={() => setTerminateAllOpen(false)}>Cancel</button>
            <button className="danger" onClick={doTerminateAll}>Proceed</button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!terminatingProgress}
        onClose={() => { terminateStopRef.current = true; }}
        title="Terminating sessions..."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 0, marginBottom: 16 }}>
          <span className="spinner" />
          <span>Terminating {terminatingProgress?.current} of {terminatingProgress?.total} session{terminatingProgress?.total === 1 ? '' : 's'}...</span>
        </div>
        <div className="btn-row">
          <button className="danger" onClick={() => { terminateStopRef.current = true; }}>
            Stop
          </button>
        </div>
      </Modal>

      <Modal
        open={reinit2faOpen}
        onClose={() => { setReinit2faOpen(false); setReinit2faCode(''); setReinit2faError(null); }}
        title="You need a 2FA code"
      >
        <form onSubmit={(e) => { e.preventDefault(); submitReinit2fa(); }}>
          <p className="mt-0" style={{ color: 'var(--muted)' }}>
            Enter the two-factor code for <strong>{active?.username}</strong> to finish...
          </p>
          <FloatingInput
            label="Two-factor code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={reinit2faCode}
            onChange={(e) => setReinit2faCode(e.target.value)}
            autoFocus
            disabled={reinitStage === 'login'}
          />
          {reinit2faError && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ErrorIcon /><span>{reinit2faError}</span>
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => { setReinit2faOpen(false); setReinit2faCode(''); setReinit2faError(null); }}
              disabled={reinitStage === 'login'}
            >
              Cancel
            </button>
            <button type="submit" disabled={reinitStage === 'login' || !reinit2faCode}>
              {reinitStage === 'login' ? <><span className="spinner" /> Logging in...</> : 'Continue'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleteStorageDoneOpen}
        onClose={() => setDeleteStorageDoneOpen(false)}
        title="All data wiped"
      >
        <p style={{ marginTop: 0 }}>Would you like to reload the app?</p>
        <div className="btn-row">
          <button onClick={() => window.location.reload()}>Yes</button>
          <button className="secondary" onClick={() => setDeleteStorageDoneOpen(false)}>No</button>
        </div>
      </Modal>

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
              Enter your current {appLockConfig?.method} to {appLockIntent === 'disable' ? 'turn off app lock' : 'change app lock'}
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
    </Suspense>
  );
}