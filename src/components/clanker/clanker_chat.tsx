import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useApiCall } from '../../hooks/api_call.js';
import { createSubscribeSession } from '../../api/subscribe.js';
import { getAgentStatus, agentChat, agentConfirm, AgentError } from '../../api/agent.ts';
import type { AgentEvent } from '../../api/agent.ts';
import { formatINR } from '../../utils/money.js';
import { subscribe, getItems, getRate, setRate, pushItem, patchItem, appendText } from '../../utils/agent_store.ts';
import type { AgentItem } from '../../utils/agent_store.ts';
import { Markdown } from '../ui/markdown.tsx';
import { Skeleton, ErrorBox } from '../ui/status.tsx';
import { LockIcon, ExternalIcon, CheckIcon, CloseIcon } from '../ui/icons.tsx';

const SUGGESTIONS = [
  'What is my balance?',
  'Show me my last 5 transactions',
  'Transfer 5 to exerinity with the note meow',
  'Make me a payment link for 100',
];

const TOOL_LABELS: Record<string, string> = {
  get_balance: 'checking your balance',
  get_account_info: 'reading your account',
  list_transactions: 'reading your history',
  get_transaction: 'looking up a transaction',
  list_payment_links: 'listing your links',
  inspect_payment_link: 'inspecting a link',
  get_restrictions: 'checking restrictions',
  list_sessions: 'listing your sessions',
  get_leaderboard: 'reading the leaderboard',
  get_team: 'reading the team',
  transfer: 'sending money',
  create_payment_link: 'creating a link',
  cancel_payment_link: 'cancelling a link',
  claim_payment_link: 'claiming a link',
};

const ARG_LABELS: Record<string, string> = {
  recipient: 'To',
  amount: 'Amount',
  note: 'Note',
  token: 'Link token',
};

export function resetLabel(reset: number): string {
  const ms = reset - Date.now();
  if (ms <= 0) return 'now';
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.round((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${minutes}m` : `${Math.max(1, minutes)}m`;
}

function ToolChip({ item }: { item: AgentItem }) {
  const [open, setOpen] = useState(false);
  const running = item.phase === 'call';
  const label = TOOL_LABELS[item.name ?? ''] ?? item.name;

  return (
    <div className={`agent-chip${item.error ? ' failed' : ''}`}>
      <button type="button" className="agent-chip-head" onClick={() => setOpen((v) => !v)}>
        {running ? <span className="spinner" /> : <span className="agent-chip-dot" />}
        <span>{item.error ? `${label} failed` : label}</span>
        <code>{item.name}</code>
      </button>
      {open && (
        <pre className="agent-chip-body">
          {JSON.stringify({ arguments: item.args, ...(item.error ? { error: item.error } : { result: item.result }) }, null, 2)}
        </pre>
      )}
    </div>
  );
}

function ConfirmCard({ item, busy, onApprove, onDecline }: {
  item: AgentItem;
  busy: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const args = (item.args ?? {}) as Record<string, unknown>;
  const rows = Object.entries(args)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => ({
      key,
      label: ARG_LABELS[key] ?? key,
      value: key === 'amount' && typeof value === 'number' ? formatINR(value) : String(value),
    }));

  return (
    <div className={`agent-confirm state-${item.state ?? 'pending'}`}>
      <div className="agent-confirm-title">{item.summary}</div>
      <dl className="agent-confirm-rows">
        {rows.map((row) => (
          <div key={row.key}>
            <dt>{row.label}</dt>
            <dd className={row.key === 'token' ? 'agent-confirm-mono' : undefined} title={row.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
      {item.state === 'pending' ? (
        <div className="agent-confirm-actions">
          <button className="btn compact" onClick={onApprove} disabled={busy}>
            <CheckIcon size={14} /> Allow
          </button>
          <button className="btn secondary compact" onClick={onDecline} disabled={busy}>
            <CloseIcon size={14} /> Cancel
          </button>
        </div>
      ) : (
        <div className="agent-confirm-state">
          {item.state === 'approved' ? 'Confirmed' : item.state === 'declined' ? 'Cancelled' : 'Expired, ask again to retry'}
        </div>
      )}
    </div>
  );
}

export interface ClankerChatProps {
  variant?: 'page' | 'drawer';
  active?: boolean;
}

export function ClankerChat({ variant = 'page', active: visible = true }: ClankerChatProps) {
  const { active } = useAuth();
  const toast = useToast();
  const drawer = variant === 'drawer';

  const items = useSyncExternalStore(subscribe, getItems);
  const rate = useSyncExternalStore(subscribe, getRate);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bubbleRef = useRef<number | null>(null);

  const statusQ = useApiCall(
    () => getAgentStatus(active!.token),
    [active?.token],
    { skip: !active?.token },
  );

  const gateError = statusQ.error instanceof AgentError ? statusQ.error : null;
  const paywalled = gateError?.code === 'subscription_required';

  useEffect(() => {
    if (statusQ.data?.rate) setRate(statusQ.data.rate);
  }, [statusQ.data]);

  useEffect(() => {
    if (!visible) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, busy, visible]);

  const handleEvent = useCallback((event: AgentEvent) => {
    if (event.type === 'text') {
      if (bubbleRef.current === null) bubbleRef.current = pushItem({ kind: 'agent', text: '' });
      appendText(bubbleRef.current, event.delta);
      return;
    }
    if (event.type === 'tool') {
      bubbleRef.current = null;
      if (event.phase === 'call') {
        pushItem({ kind: 'tool', name: event.name, args: event.args, phase: 'call' });
        return;
      }
      const open = [...getItems()].reverse().find((i) => i.kind === 'tool' && i.name === event.name && i.phase === 'call');
      const patch = { phase: 'result' as const, result: event.result, error: event.error };
      if (open) patchItem(open.id, patch);
      else pushItem({ kind: 'tool', name: event.name, args: event.args, ...patch });
      return;
    }
    if (event.type === 'confirm') {
      bubbleRef.current = null;
      pushItem({ kind: 'confirm', actionId: event.id, name: event.name, args: event.args, summary: event.summary, state: 'pending' });
      return;
    }
    if (event.type === 'debug') {
      bubbleRef.current = null;
      pushItem({ kind: 'tool', name: 'raw model output', phase: 'result', result: event.payload });
      return;
    }
    if (event.type === 'error') {
      bubbleRef.current = null;
      pushItem({ kind: 'error', text: event.message });
      return;
    }
    if (event.type === 'done') {
      bubbleRef.current = null;
      if (event.rate) setRate(event.rate);
    }
  }, []);

  const handleFailure = useCallback((err: unknown) => {
    bubbleRef.current = null;
    if (err instanceof AgentError) {
      if (err.code === 'subscription_required') {
        statusQ.refetch();
        return;
      }
      if (err.rate) setRate(err.rate);
      pushItem({ kind: 'error', text: err.message });
      return;
    }
    pushItem({ kind: 'error', text: err instanceof Error ? err.message : 'Something went wrong.' });
  }, [statusQ]);

  const send = useCallback(async (text: string) => {
    if (!active || busy) return;
    const message = text.trim();
    if (!message) return;
    setInput('');
    pushItem({ kind: 'user', text: message });
    setBusy(true);
    bubbleRef.current = null;
    try {
      await agentChat(active.token, { message, env: active.env }, handleEvent);
    } catch (err) {
      handleFailure(err);
    } finally {
      bubbleRef.current = null;
      setBusy(false);
      inputRef.current?.focus();
    }
  }, [active, busy, handleEvent, handleFailure]);

  const resolve = useCallback(async (item: AgentItem, approve: boolean) => {
    if (!active || busy || !item.actionId) return;
    patchItem(item.id, { state: approve ? 'approved' : 'declined' });
    setBusy(true);
    bubbleRef.current = null;
    try {
      await agentConfirm(active.token, { id: item.actionId, approve, env: active.env }, handleEvent);
    } catch (err) {
      if (err instanceof AgentError && err.code === 'expired') patchItem(item.id, { state: 'expired' });
      handleFailure(err);
    } finally {
      bubbleRef.current = null;
      setBusy(false);
    }
  }, [active, busy, handleEvent, handleFailure]);

  async function startSubscribe() {
    if (!active || subscribing) return;
    setSubscribing(true);
    try {
      const { checkout_url } = await createSubscribeSession(active.token, 'agent');
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start checkout');
      setSubscribing(false);
    }
  }

  if (statusQ.loading && !statusQ.data) {
    return (
      <div className={drawer ? 'agent-drawer-pad' : 'card'}>
        <Skeleton width={200} height={18} />
        <Skeleton width="100%" height={90} style={{ marginTop: 12 }} />
      </div>
    );
  }

  if (paywalled) {
    return (
      <div className={drawer ? 'agent-drawer-pad' : 'card'}>
        <div className="agent-locked-icon"><LockIcon size={22} /></div>
        <h3 style={{ marginTop: 0 }}>Try MyClankerIndia</h3>
        <p className="muted">
          MyClankerIndia is an experimental AI agent that can do a similar array of tasks
          as MyCLiIndia, but instead with a large language model. Subscribe for 200
          INR a week, with a 1 day free trial, for 20 messages every 24 hours.</p>
        <button className="btn" onClick={startSubscribe} disabled={subscribing}>
          {subscribing ? 'Taking you to MyPayIndia...' : 'Subscribe for 200 INR a week'} <ExternalIcon size={13} />
        </button>
      </div>
    );
  }

  if (statusQ.error) {
    return <div className={drawer ? 'agent-drawer-pad' : undefined}><ErrorBox error={statusQ.error} /></div>;
  }

  const last = items[items.length - 1];
  const thinking = busy && (!last || last.kind !== 'agent' || !last.text);

  return (
    <div className={`agent-shell${drawer ? ' agent-shell--drawer' : ''}`}>
      <div className="agent-scroll" ref={scrollRef}>
        {items.length === 0 && (
          <div className="agent-empty">
            <h2>MyClankerIndia Preview</h2>
            <p>Welcome to the MyClankerIndia preview! This uses IBM Granite 4.0 H Micro, and you can use it to do the same array of stuff in MyCLiIndia. Enjoy!</p>
            <p className="agent-empty-disclaimer">Again, this is just a preview, which could be removed at any time.</p>
            <div className="agent-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} type="button" className="agent-suggestion" onClick={() => send(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {items.map((item) => {
          if (item.kind === 'user') return <div key={item.id} className="agent-msg user">{item.text}</div>;
          if (item.kind === 'agent') return <div key={item.id} className="agent-msg agent"><Markdown text={item.text ?? ''} className="agent-md" /></div>;
          if (item.kind === 'error') return <div key={item.id} className="agent-msg failed">{item.text}</div>;
          if (item.kind === 'tool') return <ToolChip key={item.id} item={item} />;
          return (
            <ConfirmCard
              key={item.id}
              item={item}
              busy={busy}
              onApprove={() => resolve(item, true)}
              onDecline={() => resolve(item, false)}
            />
          );
        })}
        {thinking && <div className="agent-thinking"><span className="spinner" /> thinking</div>}
      </div>

      <form className="agent-composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder={busy ? 'Working on it...' : 'Ask MyClankerIndia...'}
          rows={1}
          maxLength={1000}
          disabled={busy}
        />
        <button className="btn compact" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>

    </div>
  );
}
