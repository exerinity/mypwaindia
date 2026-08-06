import { useState, useRef, useEffect, useSyncExternalStore } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { ChatWidget } from './converse_widget.tsx';
import { ChatBubbleIcon, ChevronDown, CloseIcon, ExternalIcon } from '../ui/icons.tsx';
import { consumeDrawerOpenRequest, CHAT_DRAWER_OPEN_EVENT, subscribeChat, getChatState } from '../../utils/converse_store.ts';
import { announceDrawerOpen, announceDrawerClosed, subscribeDrawers, getOpenDrawer } from '../../utils/drawer_bus.ts';
import '../../styles/converse_drawer.css';

const CLOSE_MS = 200;

export function ChatDrawer() {
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [entered, setEntered] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatState = useSyncExternalStore(subscribeChat, getChatState);

  const onChatPage = location.pathname === '/i/converse' || location.pathname.startsWith('/i/converse/');
  const hidden = !settings.chatDrawer || onChatPage;

  const openDrawerId = useSyncExternalStore(subscribeDrawers, getOpenDrawer);
  const otherOpen = openDrawerId !== null && openDrawerId !== 'chat';

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerClosed('chat');
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
    announceDrawerClosed('chat');
  }, [hidden]);

  useEffect(() => {
    function onOpenRequest() {
      consumeDrawerOpenRequest();
      if (closeTimer.current) clearTimeout(closeTimer.current);
      announceDrawerOpen('chat');
      setClosing(false);
      setMinimized(false);
      setOpen(true);
    }
    if (consumeDrawerOpenRequest()) onOpenRequest();
    window.addEventListener(CHAT_DRAWER_OPEN_EVENT, onOpenRequest);
    return () => window.removeEventListener(CHAT_DRAWER_OPEN_EVENT, onOpenRequest);
  }, []);

  function openDrawer() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    announceDrawerOpen('chat');
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
      announceDrawerClosed('chat');
    }, CLOSE_MS);
  }

  if (settings.scambait) return null;

  const launcherOut = hidden || !entered || otherOpen || (open && !closing);
  const stackedAbove = (settings.cliDrawer ? 1 : 0) + (settings.clankerDrawer ? 1 : 0);

  return (
    <>
      <button
        className={`converse-launcher${launcherOut ? ' converse-launcher--out' : ''}`}
        style={{ '--converse-stack': stackedAbove } as CSSProperties}
        onClick={openDrawer}
        title="Open Converse"
        aria-label="Open Converse"
        aria-hidden={launcherOut}
        tabIndex={launcherOut ? -1 : 0}
      >
        <ChatBubbleIcon size={20} />
      </button>

      {open && !hidden && (
        <div className={`converse-drawer${minimized ? ' converse-drawer--min' : ''}${closing ? ' converse-drawer--closing' : ''}`}>
          <div
            className="converse-drawer-header"
            onClick={() => { if (minimized) setMinimized(false); }}
          >
            <span className="converse-drawer-icon"><ChatBubbleIcon size={16} /></span>
            <span className="converse-drawer-title">Converse</span>
            <div className="converse-drawer-actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="converse-drawer-btn"
                onClick={() => { closeDrawer(); navigate(chatState.activePeer ? `/i/converse/${chatState.activePeer}` : '/i/converse'); }}
                title="Open the full page"
                aria-label="Open the full page"
              >
                <ExternalIcon size={16} />
              </button>
              <button
                className={`converse-drawer-btn${minimized ? ' converse-drawer-btn--flip' : ''}`}
                onClick={() => setMinimized((m) => !m)}
                title={minimized ? 'Expand' : 'Minimize'}
                aria-label={minimized ? 'Expand' : 'Minimize'}
              >
                <ChevronDown size={18} />
              </button>
              <button
                className="converse-drawer-btn"
                onClick={closeDrawer}
                title="Close"
                aria-label="Close"
              >
                <CloseIcon size={17} />
              </button>
            </div>
          </div>
          <div className="converse-drawer-body">
            <ChatWidget variant="drawer" showHeader={false} />
          </div>
        </div>
      )}
    </>
  );
}

export default ChatDrawer;
