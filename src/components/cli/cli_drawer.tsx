import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { CliTerminal } from './cli_terminal.tsx';
import { TerminalIcon, ChevronDown, CloseIcon, ExternalIcon } from '../ui/icons.tsx';
import { clearLines, consumeDrawerOpenRequest, CLI_DRAWER_OPEN_EVENT } from '../../utils/cli_store.ts';
import { announceDrawerOpen, announceDrawerClosed, subscribeDrawers, getOpenDrawer } from '../../utils/drawer_bus.ts';
import { cli_drawer_classes } from '../../styles/cli_drawer.stylex.ts';

const CLOSE_MS = 200;

export function CliDrawer() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [entered, setEntered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCliPage = location.pathname === '/i/command' || location.pathname.startsWith('/i/command/');
  const hidden = !settings.cliDrawer || onCliPage;

  const openDrawerId = useSyncExternalStore(subscribeDrawers, getOpenDrawer);
  const otherOpen = openDrawerId !== null && openDrawerId !== 'cli';

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerClosed('cli');
  }, []);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => { inner = requestAnimationFrame(() => setEntered(true)); });
    return () => { cancelAnimationFrame(outer); cancelAnimationFrame(inner); };
  }, []);

  useEffect(() => {
    if (!hidden) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(false);
    setClosing(false);
    announceDrawerClosed('cli');
  }, [hidden]);

  useEffect(() => {
    function onOpenRequest() {
      consumeDrawerOpenRequest();
      if (closeTimer.current) clearTimeout(closeTimer.current);
      announceDrawerOpen('cli');
      setClosing(false);
      setMinimized(false);
      setOpen(true);
    }
    if (consumeDrawerOpenRequest()) onOpenRequest();
    window.addEventListener(CLI_DRAWER_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(CLI_DRAWER_OPEN_EVENT, onOpenRequest);
  }, []);

  function openDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerOpen('cli');
    setClosing(false);
    setMinimized(false);
    setOpen(true);
  }

  useEffect(() => {
    if (open && otherOpen) closeDrawer();
  }, [open, otherOpen]);

  function closeDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      announceDrawerClosed('cli');
    }, CLOSE_MS);
  }

  const launcherOut = hidden || !entered || otherOpen || (open && !closing);

  return (
    <>
      <button
        className={`cli-launcher${launcherOut ? ' cli-launcher--out' : ''} ${launcherOut ? cli_drawer_classes.launcher_out : cli_drawer_classes.launcher}`}
        onClick={openDrawer}
        title="Open MyCLiIndia"
        aria-label="Open MyCLiIndia"
        aria-hidden={launcherOut}
        tabIndex={launcherOut ? -1 : 0}
      >
        <TerminalIcon size={22} />
      </button>

      {open && !hidden && (
        <div className={`cli-drawer${minimized ? ' cli-drawer--min' : ''}${closing ? ' cli-drawer--closing' : ''} ${closing ? cli_drawer_classes.drawer_closing : cli_drawer_classes.drawer}`}>
          <div
            className={`cli-drawer-header ${minimized ? cli_drawer_classes.header_minimized : cli_drawer_classes.header}`}
            onClick={() => { if (minimized) setMinimized(false); }}
          >
            <span className={`cli-drawer-icon ${cli_drawer_classes.icon}`}><TerminalIcon size={17} /></span>
            <span className={`cli-drawer-title ${cli_drawer_classes.title}`}>MyCLiIndia</span>
            <div className={`cli-drawer-actions ${cli_drawer_classes.actions}`} onClick={(e) => e.stopPropagation()}>
              <button className={`cli-drawer-btn cli-drawer-btn--text ${cli_drawer_classes.button_text}`} onClick={clearLines} title="Clear terminal history">
                CLEAR
              </button>
              <button
                className={`cli-drawer-btn ${cli_drawer_classes.button}`}
                onClick={() => { closeDrawer(); navigate('/i/command'); }}
                title="Open the full page"
                aria-label="Open the full page"
              >
                <ExternalIcon size={16} />
              </button>
              <button
                className={`cli-drawer-btn${minimized ? ' cli-drawer-btn--flip' : ''} ${minimized ? cli_drawer_classes.button_flip : cli_drawer_classes.button}`}
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? 'Expand' : 'Minimize'}
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown size={18} />
              </button>
              <button
                className={`cli-drawer-btn ${cli_drawer_classes.button}`}
                onClick={closeDrawer}
                title="Close"
                aria-label="Close"
              >
                <CloseIcon size={17} />
              </button>
            </div>
          </div>
          <div className={`cli-drawer-body ${minimized ? cli_drawer_classes.body_minimized : cli_drawer_classes.body}`}>
            <CliTerminal variant="drawer" active={!minimized && !closing} onExit={closeDrawer} />
          </div>
        </div>
      )}
    </>
  );
}

export default CliDrawer;
