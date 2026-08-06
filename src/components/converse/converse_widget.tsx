import { useState, useEffect, useRef, useSyncExternalStore } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useApiCall } from '../../hooks/api_call.js';
import {
  getChatStatus, enrollChat, unenrollChat, lookupChatUser,
  blockChatUser, unblockChatUser, listBlockedUsers,
} from '../../api/converse.ts';
import type { ChatMessage } from '../../api/converse.ts';
import {
  subscribeChat, getChatState, connectChat, disconnectChat,
  refreshConversations, openConversation, closeConversation,
  sendMessage, editMessage, deleteMessage, sendTyping,
} from '../../utils/converse_store.ts';
import { Skeleton, ErrorBox } from '../ui/status.tsx';
import { Modal } from '../ui/modal.tsx';
import { ArrowLeftIcon, CheckIcon, PlusIcon } from '../ui/icons.tsx';
import '../../styles/converse.css';

function timeLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function relativeTime(ts: number): string {
  const ms = Date.now() - ts;
  if (ms < 60000) return 'just now';
  const minutes = Math.floor(ms / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function PresenceLabel({ online, lastSeen }: { online: boolean; lastSeen?: number }) {
  return (
    <span className="converse-presence">
      <span className={`converse-dot${online ? ' online' : ''}`} />
      {online ? 'online' : lastSeen ? `last seen ${relativeTime(lastSeen)}` : 'offline'}
    </span>
  );
}

function Bubble({ message, mine, onEdit, onDelete }: {
  message: ChatMessage; mine: boolean;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);

  if (message.deleted) {
    return <div className={`converse-msg${mine ? ' mine' : ''} deleted`}><em>message deleted</em></div>;
  }

  if (editing) {
    return (
      <div className={`converse-msg${mine ? ' mine' : ''} editing`}>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} />
        <div className="converse-msg-edit-actions">
          <button type="button" className="btn ghost compact" onClick={() => setEditing(false)}>Cancel</button>
          <button
            type="button"
            className="btn compact"
            onClick={() => { onEdit(message.id, draft.trim()); setEditing(false); }}
            disabled={!draft.trim()}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`converse-msg${mine ? ' mine' : ''}${message.pending ? ' pending' : ''}${message.failed ? ' failed' : ''}`}>
      <div className="converse-msg-text">{message.text}</div>
      <div className="converse-msg-meta">
        {message.pending && <span className="converse-msg-pending">sending...</span>}
        {message.failed && <span className="converse-msg-failed">failed to send</span>}
        {!message.pending && !message.failed && message.editedAt && (
          <span className="converse-msg-edited" title={`Edited ${new Date(message.editedAt).toLocaleString()}`}>edited</span>
        )}
        {!message.pending && !message.failed && <span>{timeLabel(message.ts)}</span>}
        {mine && !message.pending && !message.failed && (
          <span className="converse-msg-actions">
            <button type="button" onClick={() => { setDraft(message.text); setEditing(true); }}>edit</button>
            <button type="button" onClick={() => onDelete(message.id)}>delete</button>
          </span>
        )}
      </div>
    </div>
  );
}

function EnrollScreen({ onEnroll, busy }: { onEnroll: () => void; busy: boolean }) {
  return (
    <div className="card converse-enroll">
      <h2 style={{ marginTop: 0 }}>Enroll in MyPWAIndia Converse</h2>
      <p className="muted">
        Converse lets you message other enrolled MyPayIndia users by username. Enrolling registers your MyPayIndia username
        in the chat directory so other
        enrolled users can find and message you.
      </p>
      <button className="btn" onClick={onEnroll} disabled={busy}>
        {busy ? 'Enrolling...' : 'Enroll with my MyPayIndia account'}
      </button><br></br>
      <small className="muted">This is independent of your MyPayIndia account and generally MyPayIndia.com as a whole and only usable here, on MyPWAIndia</small><br></br>
      <small className="muted">Converse could be removed at any time, so treat it entirely as an experimental feature</small><br></br>
    </div>
  );
}

export interface ChatWidgetProps {
  variant: 'page' | 'drawer';
  showHeader?: boolean;
  routePeer?: string;
  onSelectPeer?: (peer: string) => void;
  onBack?: () => void;
}

export function ChatWidget({ variant, showHeader = true, routePeer, onSelectPeer, onBack }: ChatWidgetProps) {
  const { active } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const token = active?.token ?? '';
  const username = active?.username ?? '';

  const state = useSyncExternalStore(subscribeChat, getChatState);
  const statusQ = useApiCall(() => getChatStatus(token), [token], { skip: !token });
  const [enrolling, setEnrolling] = useState(false);
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const [newPeer, setNewPeer] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [input, setInput] = useState('');
  const [blocked, setBlocked] = useState<string[]>([]);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enrolled = statusQ.data?.enrolled === true;

  useEffect(() => {
    if (!enrolled || !token || !username) return;
    connectChat(token, username);
    refreshConversations(token).catch(() => {});
    return () => disconnectChat();
  }, [enrolled, token, username]);

  useEffect(() => {
    if (!enrolled || !token || routePeer === undefined) return;
    if (routePeer) {
      openConversation(token, routePeer);
      setMobileShowThread(true);
    } else {
      closeConversation();
      setMobileShowThread(false);
    }
  }, [enrolled, token, routePeer]);

  useEffect(() => {
    if (!state.activePeer || !token) return;
    listBlockedUsers(token).then(setBlocked).catch(() => {});
  }, [state.activePeer, token]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [state.messages.length]);

  function selectPeer(peer: string) {
    if (onSelectPeer) {
      onSelectPeer(peer);
    } else {
      openConversation(token, peer);
      setMobileShowThread(true);
    }
  }

  function goBack() {
    if (onBack) {
      onBack();
    } else {
      closeConversation();
      setMobileShowThread(false);
    }
  }

  async function handleEnroll() {
    setEnrolling(true);
    try {
      await enrollChat(token);
      await statusQ.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not enroll');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleLeave() {
    setLeaving(true);
    try {
      disconnectChat();
      await unenrollChat(token);
      await statusQ.refetch();
      toast.success('You have left Converse. Thanks for trying it out!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not leave');
    } finally {
      setLeaving(false);
    }
  }

  function closeNewMessage() {
    setNewMessageOpen(false);
    setNewPeer('');
    setNewMessageText('');
  }

  async function handleNewMessage() {
    const target = newPeer.trim().toLowerCase();
    const text = newMessageText.trim();
    if (!target || !text || target === username.toLowerCase()) return;
    setLookingUp(true);
    try {
      const result = await lookupChatUser(token, target);
      if (!result.enrolled) {
        toast.error('That person isn\'t enrolled in Converse yet! Why not ask them to enroll?');
        return;
      }
      await sendMessage(token, target, text);
      selectPeer(target);
      closeNewMessage();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that');
    } finally {
      setLookingUp(false);
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || !state.activePeer) return;
    if (blocked.includes(state.activePeer)) {
      toast.error('Unblock this user before messaging them');
      return;
    }
    setInput('');
    try {
      await sendMessage(token, state.activePeer, text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that');
    }
  }

  function handleTyping(value: string) {
    setInput(value);
    if (!state.activePeer) return;
    if (typingTimer.current) return;
    sendTyping(state.activePeer);
    typingTimer.current = setTimeout(() => { typingTimer.current = null; }, 2000);
  }

  async function handleEdit(id: string, text: string) {
    if (!state.activePeer || !text) return;
    try {
      await editMessage(token, id, state.activePeer, text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not edit that');
    }
  }

  async function handleDelete(id: string) {
    if (!state.activePeer) return;
    try {
      await deleteMessage(token, id, state.activePeer);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete that');
    }
  }

  async function toggleBlock() {
    if (!state.activePeer) return;
    const isBlocked = blocked.includes(state.activePeer);
    try {
      if (isBlocked) {
        await unblockChatUser(token, state.activePeer);
        setBlocked((b) => b.filter((u) => u !== state.activePeer));
      } else {
        await blockChatUser(token, state.activePeer);
        setBlocked((b) => [...b, state.activePeer!]);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update block state');
    }
  }

  const pad = variant === 'drawer' ? 'converse-drawer-pad' : undefined;

  if (settings.scambait) {
    return <div className={pad}>{showHeader && <h1 className="mt-0">Page unavailable</h1>}</div>;
  }

  if (statusQ.loading && !statusQ.data) {
    return <div className={pad}><Skeleton width="100%" height={120} /></div>;
  }

  if (statusQ.error) {
    return <div className={pad}><ErrorBox error={statusQ.error} /></div>;
  }

  if (!enrolled) {
    return (
      <div className={pad}>
        {showHeader && <h1 className="mt-0">Converse</h1>}
        <EnrollScreen onEnroll={handleEnroll} busy={enrolling} />
      </div>
    );
  }

  const activeConvo = state.conversations.find((c) => c.peer === state.activePeer);
  const isBlocked = state.activePeer ? blocked.includes(state.activePeer) : false;
  const isTyping = state.activePeer ? !!state.typing[state.activePeer] : false;

  return (
    <div className={`mpi-converse-layout mpi-converse-layout--${variant}`}>
      {leaving && (
        <div className="converse-leaving-overlay">
          <span className="spinner lg" />
          <p>Unenrolling from Converse...</p>
        </div>
      )}
      <div className={`mpi-converse-nav${mobileShowThread ? ' mpi-converse-nav--hidden' : ''}`}>
        {showHeader && (
          <div className="mpi-converse-nav-header">
            <h1>Converse</h1>
          </div>
        )}

        <div className="converse-new">
          <button type="button" className="btn compact converse-new-btn" onClick={() => setNewMessageOpen(true)}>
            <PlusIcon size={14} /> New conversation
          </button>
        </div>

        <div className="mpi-converse-nav-list">
          {state.conversations.length === 0 && (
            <p className="converse-empty-list muted">empty</p>
          )}
          {state.conversations.map((c) => (
            <button
              key={c.peer}
              type="button"
              className={`mpi-converse-nav-item${c.peer === state.activePeer ? ' active' : ''}`}
              onClick={() => selectPeer(c.peer)}
            >
              <span className="converse-convo-body">
                <PresenceLabel online={c.online} lastSeen={state.lastSeen[c.peer]} />
                <span className="converse-convo-name">@{c.peer}</span>
                <span className="converse-convo-preview">{c.deleted ? 'message deleted' : c.lastText}</span>
              </span>
              {c.unread > 0 && <span className="converse-badge">{c.unread}</span>}
            </button>
          ))}
        </div>

        <div className="mpi-converse-nav-footer">
          <button className="btn ghost compact" onClick={handleLeave}>Unenroll from Converse</button>
        </div>
      </div>

      <div className={`mpi-converse-detail${mobileShowThread ? ' mpi-converse-detail--visible' : ''}`}>
        {!state.activePeer && (
          <div className="converse-thread-empty muted">empty</div>
        )}
        {state.activePeer && (
          <>
            <div className="mpi-converse-detail-header">
              <button
                className="mpi-converse-detail-back"
                onClick={goBack}
                aria-label="Back to conversations"
              >
                <ArrowLeftIcon size={18} />
              </button>
              <div className="converse-thread-title">
                <PresenceLabel online={!!activeConvo?.online} lastSeen={state.activePeer ? state.lastSeen[state.activePeer] : undefined} />
                <span className="converse-thread-name">@{state.activePeer}</span>
              </div>
              <button type="button" className="btn ghost compact" onClick={toggleBlock} style={{ marginLeft: 'auto' }}>
                {isBlocked ? 'Unblock' : 'Block'}
              </button>
            </div>

            <div className="converse-scroll" ref={scrollRef}>
              {state.loadingMessages && <Skeleton width="100%" height={80} />}
              {!state.loadingMessages && state.messages.map((m) => (
                <Bubble
                  key={m.id}
                  message={m}
                  mine={m.from.toLowerCase() === username.toLowerCase()}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
              {isTyping && <div className="converse-typing muted">@{state.activePeer} is typing...</div>}
            </div>

            <form className="converse-composer" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
              <textarea
                value={input}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isBlocked ? 'You have blocked this user' : `Message @${state.activePeer}...`}
                rows={1}
                disabled={isBlocked}
              />
              <button type="submit" className="btn compact" disabled={!input.trim() || isBlocked}>
                <CheckIcon size={15} />
              </button>
            </form>
          </>
        )}
      </div>

      <Modal open={newMessageOpen} onClose={closeNewMessage} title="New message">
        <form onSubmit={(e) => { e.preventDefault(); handleNewMessage(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="converse-new-recipient">Recipient</label>
            <input
              id="converse-new-recipient"
              type="text"
              value={newPeer}
              onChange={(e) => setNewPeer(e.target.value)}
              placeholder="Username..."
              autoComplete="off"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="converse-new-text">Message</label>
            <textarea
              id="converse-new-text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder="Say something..."
              rows={3}
            />
          </div>
          <button type="submit" className="btn" disabled={!newPeer.trim() || !newMessageText.trim() || lookingUp}>
            {lookingUp ? 'Sending...' : 'Send'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
