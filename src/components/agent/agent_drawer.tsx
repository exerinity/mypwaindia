import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { AgentChat } from '../../pages/account/agent.tsx';
import {
  announceDrawerClosed,
  announceDrawerOpen,
  getOpenDrawer,
  subscribeDrawers,
} from '../../utils/drawer_bus.ts';
import { ChevronDown, CloseIcon, ExternalIcon, AgentIcon } from '../ui/icons.tsx';
import { agent_drawer_classes } from '../../styles/agent_drawer.stylex.ts';

const CLOSE_MS = 200;
const PANEL_ID = 'agent-drawer-panel';
const BODY_ID = 'agent-drawer-body';

function isAgentPath(pathname: string | undefined): boolean {
  return pathname === '/i/agent' || Boolean(pathname?.startsWith('/i/agent/'));
}

export function AgentDrawer() {
  const { settings } = useSettings();
  const { active } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [entered, setEntered] = useState(false);
  const [resetRequest, setResetRequest] = useState(0);
  const [chatBusy, setChatBusy] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreFocusOnClose = useRef(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const backgroundPathname = (location.state as {
    backgroundLocation?: { pathname?: string };
  } | null)?.backgroundLocation?.pathname;
  const onAgentPage = isAgentPath(location.pathname) || isAgentPath(backgroundPathname);
  const onCliPage = location.pathname === '/i/command' || location.pathname.startsWith('/i/command/');
  const hidden = !settings.agentDrawer || !active || settings.scambait || onAgentPage;
  const stackAboveCli = settings.cliDrawer && !onCliPage;

  const openDrawerId = useSyncExternalStore(subscribeDrawers, getOpenDrawer);
  const otherOpen = openDrawerId !== null && openDrawerId !== 'agent';

  const closeDrawer = useCallback((restoreFocus = true) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    restoreFocusOnClose.current = restoreFocus;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setOpen(false);
      setClosing(false);
      announceDrawerClosed('agent');

      if (restoreFocusOnClose.current) {
        requestAnimationFrame(() => {
          const launcher = launcherRef.current;
          if (launcher?.getAttribute('aria-hidden') !== 'true') launcher?.focus();
        });
      }
    }, CLOSE_MS);
  }, []);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerClosed('agent');
  }, []);

  useEffect(() => {
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  useEffect(() => {
    if (!hidden) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    restoreFocusOnClose.current = false;
    setOpen(false);
    setClosing(false);
    setMinimized(false);
    announceDrawerClosed('agent');
  }, [hidden]);

  useEffect(() => {
    if (open && otherOpen) closeDrawer(false);
  }, [closeDrawer, open, otherOpen]);

  useEffect(() => {
    if (!open || closing) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      event.preventDefault();
      closeDrawer();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeDrawer, closing, open]);

  useEffect(() => {
    if (!open || closing || minimized) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    const id = requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [closing, minimized, open]);

  function openDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    restoreFocusOnClose.current = false;
    announceDrawerOpen('agent');
    setClosing(false);
    setMinimized(false);
    setOpen(true);
  }

  function openFullPage() {
    closeDrawer(false);
    navigate('/i/agent');
  }

  const launcherOut = hidden || !entered || otherOpen || (open && !closing);
  const expanded = open && !closing;

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={`${stackAboveCli ? ' agent-launcher--stacked' : ''}${launcherOut ? ' agent-launcher--out' : ''} ${stackAboveCli ? (launcherOut ? agent_drawer_classes.launcher_stacked_out : agent_drawer_classes.launcher_stacked) : (launcherOut ? agent_drawer_classes.launcher_out : agent_drawer_classes.launcher)}`}
        onClick={openDrawer}
        title="Open MyAgentIndia"
        aria-label="Open MyAgentIndia"
        aria-controls={PANEL_ID}
        aria-expanded={expanded}
        aria-hidden={launcherOut}
        tabIndex={launcherOut ? -1 : 0}
      >
        <AgentIcon size={22} />
      </button>

      {open && !hidden && (
        <div
          ref={panelRef}
          id={PANEL_ID}
          className={`agent-drawer${minimized ? ' agent-drawer--min' : ''}${closing ? ' agent-drawer--closing' : ''} ${closing ? agent_drawer_classes.drawer_closing : agent_drawer_classes.drawer}`}
          role="region"
          aria-label="MyAgentIndia drawer"
          tabIndex={-1}
        >
          <div
            className={`agent-drawer-header ${minimized ? agent_drawer_classes.header_minimized : agent_drawer_classes.header}`}
            onClick={() => { if (minimized) setMinimized(false); }}
          >
            <span className={`agent-drawer-icon ${agent_drawer_classes.icon}`}><AgentIcon size={17} /></span>
            <span className={`agent-drawer-title ${agent_drawer_classes.title}`}>MyAgentIndia</span>
            <div className={`agent-drawer-actions ${agent_drawer_classes.actions}`} onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className={`agent-drawer-btn agent-drawer-btn--text ${agent_drawer_classes.button_text}`}
                onClick={() => {
                  setMinimized(false);
                  setResetRequest((request) => request + 1);
                }}
                disabled={chatBusy}
                title="Start a new conversation"
                aria-label="Start a new conversation"
              >
                RESET
              </button>
              <button
                type="button"
                className={`agent-drawer-btn ${agent_drawer_classes.button}`}
                onClick={openFullPage}
                disabled={chatBusy}
                title="Open the full page"
                aria-label="Open the full page"
              >
                <ExternalIcon size={16} />
              </button>
              <button
                type="button"
                className={`agent-drawer-btn${minimized ? ' agent-drawer-btn--flip' : ''} ${minimized ? agent_drawer_classes.button_flip : agent_drawer_classes.button}`}
                onClick={() => setMinimized((value) => !value)}
                title={minimized ? 'Expand' : 'Minimize'}
                aria-label={minimized ? 'Expand' : 'Minimize'}
                aria-controls={BODY_ID}
                aria-expanded={!minimized}
              >
                <ChevronDown size={18} />
              </button>
              <button
                type="button"
                className={`agent-drawer-btn ${agent_drawer_classes.button}`}
                onClick={() => closeDrawer()}
                title="Close"
                aria-label="Close"
              >
                <CloseIcon size={17} />
              </button>
            </div>
          </div>
          <div id={BODY_ID} className={`agent-drawer-body ${minimized ? agent_drawer_classes.body_minimized : agent_drawer_classes.body}`} aria-hidden={minimized}>
            <AgentChat
              variant="drawer"
              visible={!minimized && !closing}
              resetRequest={resetRequest}
              onBusyChange={setChatBusy}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default AgentDrawer;
