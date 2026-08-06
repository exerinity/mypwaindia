import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { ClankerChat } from './clanker_chat.tsx';
import { SparkleIcon, ChevronDown, CloseIcon, ExternalIcon } from '../ui/icons.tsx';
import { resetAgentThread } from '../../api/agent.ts';
import { clearItems, consumeDrawerOpenRequest, CLANKER_DRAWER_OPEN_EVENT } from '../../utils/agent_store.ts';
import { announceDrawerOpen, announceDrawerClosed, subscribeDrawers, getOpenDrawer } from '../../utils/drawer_bus.ts';
import '../../styles/clanker_drawer.css';

const CLOSE_MS = 200;

export function ClankerDrawer() {
  const { settings } = useSettings();
  const { active } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [entered, setEntered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClankerPage = location.pathname === '/i/clanker';
  const hidden = !settings.clankerDrawer || onClankerPage;
  const stacked = settings.cliDrawer;

  const openDrawerId = useSyncExternalStore(subscribeDrawers, getOpenDrawer);
  const otherOpen = openDrawerId !== null && openDrawerId !== 'clanker';

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerClosed('clanker');
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
    announceDrawerClosed('clanker');
  }, [hidden]);

  useEffect(() => {
    function onOpenRequest() {
      consumeDrawerOpenRequest();
      if (closeTimer.current) clearTimeout(closeTimer.current);
      announceDrawerOpen('clanker');
      setClosing(false);
      setMinimized(false);
      setOpen(true);
    }
    if (consumeDrawerOpenRequest()) onOpenRequest();
    window.addEventListener(CLANKER_DRAWER_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(CLANKER_DRAWER_OPEN_EVENT, onOpenRequest);
  }, []);

  function openDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerOpen('clanker');
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
      announceDrawerClosed('clanker');
    }, CLOSE_MS);
  }

  function wipe() {
    clearItems();
    if (active) resetAgentThread(active.token).catch(() => {});
  }

  if (settings.scambait) return null;

  const launcherOut = hidden || !entered || otherOpen || (open && !closing);

  return (
    <>
      <button
        className={`clanker-launcher${stacked ? ' clanker-launcher--stacked' : ''}${launcherOut ? ' clanker-launcher--out' : ''}`}
        onClick={openDrawer}
        title="Open Clanker"
        aria-label="Open Clanker"
        aria-hidden={launcherOut}
        tabIndex={launcherOut ? -1 : 0}
      >
        <SparkleIcon size={22} />
      </button>

      {open && !hidden && (
        <div className={`clanker-drawer${minimized ? ' clanker-drawer--min' : ''}${closing ? ' clanker-drawer--closing' : ''}`}>
          <div
            className="clanker-drawer-header"
            onClick={() => { if (minimized) setMinimized(false); }}
          >
            <span className="clanker-drawer-icon"><SparkleIcon size={17} /></span>
            <span className="clanker-drawer-title">Clanker</span>
            <div className="clanker-drawer-actions" onClick={(e) => e.stopPropagation()}>
              <button className="clanker-drawer-btn clanker-drawer-btn--text" onClick={wipe} title="Clear the conversation">
                CLEAR
              </button>
              <button
                className="clanker-drawer-btn"
                onClick={() => { closeDrawer(); navigate('/i/clanker'); }}
                title="Open the full page"
                aria-label="Open the full page"
              >
                <ExternalIcon size={16} />
              </button>
              <button
                className={`clanker-drawer-btn${minimized ? ' clanker-drawer-btn--flip' : ''}`}
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? 'Expand' : 'Minimize'}
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown size={18} />
              </button>
              <button
                className="clanker-drawer-btn"
                onClick={closeDrawer}
                title="Close"
                aria-label="Close"
              >
                <CloseIcon size={17} />
              </button>
            </div>
          </div>
          <div className="clanker-drawer-body">
            <ClankerChat variant="drawer" active={!minimized && !closing} />
          </div>
        </div>
      )}
    </>
  );
}

export default ClankerDrawer;
