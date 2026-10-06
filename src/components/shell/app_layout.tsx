import { utility_classes } from '../../styles/utils.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import { animation_classes } from '../../styles/animations.stylex.ts';
import { shell_classes } from '../../styles/shell.stylex.ts';
import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { LoginIcon, WarningIcon } from '../ui/icons.tsx';
import { storageGet, storageSet, KEYS } from '../../utils/storage.ts';
import { THEME_PANEL_OPEN_EVENT } from '../../utils/theme_panel_store.ts';
import { RELEASES } from '../../pages/information/release_notes.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { HeaderSkeleton, SidebarSkeleton } from './app_skeleton.tsx';
import { agent_classes } from '../../styles/agent.stylex.ts';
import { layout_classes } from '../../styles/layout.stylex.ts';

const Header = lazy(() => import('./header.tsx').then((m) => ({ default: m.Header })));
const Sidebar = lazy(() => import('./sidebar.tsx').then((m) => ({ default: m.Sidebar })));
const VerificationBanner = lazy(() => import('../account/verify_banner.tsx').then((m) => ({ default: m.VerificationBanner })));
const BottomNav = lazy(() => import('./bottom_nav.tsx').then((m) => ({ default: m.BottomNav })));
const CliDrawer = lazy(() => import('../cli/cli_drawer.tsx').then((m) => ({ default: m.CliDrawer })));
const AgentDrawer = lazy(() => import('../agent/agent_drawer.tsx').then((m) => ({ default: m.AgentDrawer })));
const ThemePanel = lazy(() => import('../../pages/settings/theme_panel.tsx').then((m) => ({ default: m.ThemePanel })));

function ServiceWorkerUpdater({ autoUpdate, toast, syncLastVersion }: {
  autoUpdate: boolean;
  toast: ReturnType<typeof useToast>;
  syncLastVersion: (announce: boolean) => void;
}) {
  const updateToastShown = useRef(false);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({});

  function performUpdate() {
    toast.info('Updating, one moment...');
    syncLastVersion(false);
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    updateServiceWorker(true);
  }

  useEffect(() => {
    if (needRefresh && !updateToastShown.current) {
      updateToastShown.current = true;
      if (autoUpdate) {
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
  }, [needRefresh, toast, autoUpdate]);

  return null;
}

export function AppLayout() {
  const restrictionsMod = useLazyModule(() => import('../../utils/restrictions.js'));
  const stickyTopRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cliDrawerMounted, setCliDrawerMounted] = useState(false);
  const [agentDrawerMounted, setAgentDrawerMounted] = useState(false);
  const [themePanelOpen, setThemePanelOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setThemePanelOpen(true);
    window.addEventListener(THEME_PANEL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(THEME_PANEL_OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const displayMod = useLazyModule(() => import('../../utils/display.js'));
  const { settings } = useSettings();
  const { active, switchingTo } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const { restrictions, restrictionsError } = useGlobalData();
  const restrictionList = Object.entries(restrictions?.restrictions || {}).filter(([, v]) => v?.active);
  const fetchFailedError = restrictionsError as { code?: number; status?: number } | null;
  const fetchFailedCode = fetchFailedError?.code;
  const bastionDown = [502, 503, 504, 523].includes(fetchFailedError?.status ?? 0);
  const fetchFailed = fetchFailedCode === -1 || fetchFailedCode === -2 || bastionDown;
  const sessionExpired = fetchFailedCode === 1001;

  function syncLastVersion(announce: boolean) {
    const latest = RELEASES[0].version;
    const stored = storageGet<string | null>(KEYS.LAST_VERSION, null);
    if (stored === latest) return;
    if (announce && stored !== null && !settings.suppressUpdateToast) {
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

  useEffect(() => {
    if (settings.cliDrawer) { setCliDrawerMounted(true); return; }
    const id = setTimeout(() => setCliDrawerMounted(false), 420);
    return () => clearTimeout(id);
  }, [settings.cliDrawer]);

  useEffect(() => {
    if (settings.agentDrawer) { setAgentDrawerMounted(true); return; }
    const id = setTimeout(() => setAgentDrawerMounted(false), 420);
    return () => clearTimeout(id);
  }, [settings.agentDrawer]);

  useEffect(() => {
    const el = stickyTopRef.current;
    if (!el) return;
    const apply = () => document.documentElement.style.setProperty('--mpi-header-h', `${el.offsetHeight}px`);
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--mpi-header-h');
    };
  }, []);

  return (
    <>
    <div className={`${location.pathname.startsWith('/settings/') ? shell_classes.mpi_shell_settings : shell_classes.mpi_shell}`}>
      {settings.swEnabled && (
        <ServiceWorkerUpdater autoUpdate={settings.autoUpdate} toast={toast} syncLastVersion={syncLastVersion} />
      )}
      <div className={`mpi-sticky-top ${shell_classes.mpi_sticky_top}`} ref={stickyTopRef}>
        <Suspense fallback={<HeaderSkeleton />}>
          <Header onToggleSidebar={() => setOpen((o) => !o)} />
          <div className={`verification-banner-stack ${shell_classes.verification_banner_stack}`}>
            {switchingTo && (
              <div className={`verification-banner banner-elev ${alert_classes.banner_elev}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={`spinner ${utility_classes.spinner}`} /> Switching to {displayMod ? displayMod.getDisplayName(switchingTo, settings.displayName) : switchingTo.username}, one moment...
              </div>
            )}
            <VerificationBanner />
            {restrictionList.length > 0 && (
              <div className={`verification-banner banner-error ${alert_classes.banner_error}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningIcon />Your account is currently restricted:{' '}
                {restrictionsMod ? restrictionList.map(([k]) => restrictionsMod.getRestrictionInfo(k).title).join(', ') : ''}.
                {' '}<Link to="/i/flow/restrictions" state={{ backgroundLocation: location }} className="link">More...</Link>
              </div>
            )}
            {active && storageGet<number>(KEYS.ONBOARD, 0) !== 1 && (
              <div className={`verification-banner ${alert_classes.banner}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningIcon /> Please read and accept the onboarding message. Once you do, this message will be hidden. <Link to="/i/onboarding" className="link">Open...</Link>
              </div>
            )}
            {sessionExpired && (
              <div className={`verification-banner ${alert_classes.banner}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LoginIcon /> Your session has expired. <Link to="/i/sessions" className="link">Reinitialize the session...</Link> <Link to="/logout" state={{ backgroundLocation: location }}>Log out of the app...</Link>
              </div>
            )}
            {fetchFailed && (
              <div className={`verification-banner ${alert_classes.banner}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningIcon /> Retrieving data failed: either the server did not respond or your session has expired. Data displayed may be out of date. <Link to="/i/connecttest" className="link">Troubleshoot...</Link> <a href="https://status.mypayindia.com" target="_blank">Status page...</a>
              </div>
            )}
            {!isOnline && (
              <div className={`verification-banner ${alert_classes.banner}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <WarningIcon /> You are offline. To do most things, you need to be connected to the internet. <Link to="/i/connecttest" className="link">Diagnose...</Link>
              </div>
            )}
            <div id="mpi-toy-banners" />
          </div>
        </Suspense>
      </div>
      <div className={`mpi-body ${location.pathname.startsWith('/settings/') ? layout_classes.body_settings : layout_classes.body}`}>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar open={open} onClose={() => setOpen(false)} />
        </Suspense>
        <main className={`mpi-main ${location.pathname.startsWith('/settings/') ? layout_classes.main_settings : layout_classes.main}${location.pathname === '/i/agent' ? ` ${agent_classes.layout_container}` : ''}`}>
          <div className={`mpi-wrap ${location.pathname.startsWith('/settings/') ? layout_classes.wrap_settings : layout_classes.wrap}${location.pathname === '/i/agent' ? ` ${agent_classes.layout_container}` : ''}`}>
            <Suspense fallback={
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                <span className={`skeleton ${animation_classes.skeleton}`} style={{ height: 28, width: '38%', borderRadius: 6 }} />
                <span className={`skeleton ${animation_classes.skeleton}`} style={{ height: 16, width: '65%' }} />
                <span className={`skeleton ${animation_classes.skeleton}`} style={{ height: 16, width: '50%' }} />
                <span className={`skeleton ${animation_classes.skeleton}`} style={{ height: 16, width: '58%', marginTop: 8 }} />
              </div>
            }><Outlet /></Suspense>
          </div>
        </main>
      </div>

    </div>

    <Suspense fallback={null}>
      <BottomNav />
    </Suspense>

    {cliDrawerMounted && (
      <Suspense fallback={null}>
        <CliDrawer />
      </Suspense>
    )}

    {agentDrawerMounted && active && (
      <Suspense fallback={null}>
        <AgentDrawer />
      </Suspense>
    )}

    {themePanelOpen && (
      <Suspense fallback={null}>
        <ThemePanel onClose={() => setThemePanelOpen(false)} />
      </Suspense>
    )}
    </>
  );
}
