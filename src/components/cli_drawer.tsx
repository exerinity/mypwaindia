import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../context/settings_ctx.tsx';
import { CliTerminal } from './cli_terminal.tsx';
import { TerminalIcon, ChevronDown, CloseIcon, ExternalIcon } from './icons.tsx';
import { clearLines, consumeDrawerOpenRequest, CLI_DRAWER_OPEN_EVENT } from '../utils/cli_store.ts';
import '../styles/cli_drawer.css';

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

  const onCliPage = location.pathname === '/i/flow/mci' || location.pathname.startsWith('/i/flow/mci/');
  const hidden = !settings.cliDrawer || onCliPage;

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

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
  }, [hidden]);

  useEffect(() => {
    function onOpenRequest() {
      consumeDrawerOpenRequest();
      if (closeTimer.current) clearTimeout(closeTimer.current);
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
    setClosing(false);
    setMinimized(false);
    setOpen(true);
  }

  function closeDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
    }, CLOSE_MS);
  }

  if (settings.scambait) return null;

  const launcherOut = hidden || !entered || (open && !closing);

  return (
    <>
      <button
        className={`cli-launcher${launcherOut ? ' cli-launcher--out' : ''}`}
        onClick={openDrawer}
        title="Open MyCLiIndia"
        aria-label="Open MyCLiIndia"
        aria-hidden={launcherOut}
        tabIndex={launcherOut ? -1 : 0}
      >
        <TerminalIcon size={22} />
      </button>

      {open && !hidden && (
        <div className={`cli-drawer${minimized ? ' cli-drawer--min' : ''}${closing ? ' cli-drawer--closing' : ''}`}>
          <div
            className="cli-drawer-header"
            onClick={() => { if (minimized) setMinimized(false); }}
          >
            <span className="cli-drawer-icon"><TerminalIcon size={17} /></span>
            <span className="cli-drawer-title">MyCLiIndia</span>
            <div className="cli-drawer-actions" onClick={(e) => e.stopPropagation()}>
              <button className="cli-drawer-btn cli-drawer-btn--text" onClick={clearLines} title="Clear terminal history">
                CLEAR
              </button>
              <button
                className="cli-drawer-btn"
                onClick={() => { closeDrawer(); navigate('/i/flow/mci'); }}
                title="Open the full page"
                aria-label="Open the full page"
              >
                <ExternalIcon size={16} />
              </button>
              <button
                className={`cli-drawer-btn${minimized ? ' cli-drawer-btn--flip' : ''}`}
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? 'Expand' : 'Minimize'}
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown size={18} />
              </button>
              <button
                className="cli-drawer-btn"
                onClick={closeDrawer}
                title="Close"
                aria-label="Close"
              >
                <CloseIcon size={17} />
              </button>
            </div>
          </div>
          <div className="cli-drawer-body">
            <CliTerminal variant="drawer" active={!minimized && !closing} onExit={closeDrawer} />
          </div>
        </div>
      )}
    </>
  );
}

export default CliDrawer;
