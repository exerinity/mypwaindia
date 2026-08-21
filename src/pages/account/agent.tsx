import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useSettings, useCurrency } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import {
  confirmAgentAction,
  declineAgentAction,
  getAgentState,
  resetAgentConversation,
  sendAgentMessage,
} from '../../api/agent.ts';
import type {
  AgentMessage,
  AgentResult,
  AgentState,
  PaymentLinkAgentCard,
  TransactionAgentCard,
  WeatherAgentCard,
  WeatherAgentDay,
} from '../../api/agent.ts';
import { AgentText } from '../../components/ui/agent_text.tsx';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { ErrorBox, Skeleton } from '../../components/ui/status.tsx';
import {
  CheckIcon,
  BulbIcon,
  CloseIcon,
  CopyIcon,
  ExternalIcon,
  LinkIcon,
  SparkleIcon,
} from '../../components/ui/icons.tsx';

const FALLBACK_MAX_LENGTH = 300;

type BusyAction = 'message' | 'confirm' | 'decline' | 'reset' | null;

function withStateDefaults(next: AgentState, previous?: AgentState | null): AgentState {
  return {
    ...previous,
    ...next,
    agent: next.agent ?? previous?.agent,
    max_length: next.max_length ?? previous?.max_length ?? FALLBACK_MAX_LENGTH,
    greeting: next.greeting ?? previous?.greeting ?? '',
    transcript: Array.isArray(next.transcript) ? next.transcript : [],
    awaiting_confirmation: next.awaiting_confirmation ?? false,
    awaiting_answer: next.awaiting_answer ?? false,
    suggestions: Array.isArray(next.suggestions) ? next.suggestions : [],
    reply: next.reply,
  };
}

function mergeTurn(previous: AgentState | null, next: AgentState, localUser?: AgentMessage): AgentState {
  const transcript = Array.isArray(next.reply)
    ? [
        ...(previous?.transcript ?? []),
        ...(localUser ? [localUser] : []),
        ...next.reply,
      ]
    : Array.isArray(next.transcript)
      ? next.transcript
      : [...(previous?.transcript ?? []), ...(localUser ? [localUser] : [])];

  return {
    ...previous,
    ...next,
    agent: next.agent ?? previous?.agent,
    max_length: next.max_length ?? previous?.max_length ?? FALLBACK_MAX_LENGTH,
    greeting: next.greeting ?? previous?.greeting ?? '',
    transcript,
    awaiting_confirmation: next.awaiting_confirmation ?? previous?.awaiting_confirmation ?? false,
    awaiting_answer: next.awaiting_answer ?? previous?.awaiting_answer ?? false,
    suggestions: Array.isArray(next.suggestions) ? next.suggestions : (previous?.suggestions ?? []),
  };
}

function safeHref(value: string): string | null {
  if (/^\/(?!\/)/.test(value) || /^https?:\/\//i.test(value)) return value;
  return null;
}

function paymentLinkHref(value: string): string | null {
  const href = safeHref(value);
  if (!href || href.startsWith('/')) return href;

  try {
    const url = new URL(href);
    if (url.origin === 'https://mypayindia.com' && url.pathname === '/pay/link') {
      const token = url.searchParams.get('token');
      if (token) return `/i/flow/links/interstitial/${encodeURIComponent(token)}`;
    }
  } catch {}

  return href;
}

function statusClass(value: string): string {
  return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
}

function responseHasSuccessfulWrite(state: AgentState): boolean {
  const messages = Array.isArray(state.reply)
    ? state.reply
    : Array.isArray(state.transcript)
      ? state.transcript.slice(-1)
      : [];
  return messages.some((message) => message.results?.some((result) => result.ok && result.writes));
}

function dateLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || 'Unknown date';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function amountLabel(value: unknown, formatCurrency: (paisa: number) => string): string {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? formatCurrency(Math.abs(amount)) : String(value ?? '—');
}

function partyLabel(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (!value || typeof value !== 'object') return 'Unknown';
  const party = value as Record<string, unknown>;
  return String(party.username ?? party.display_name ?? party.name ?? 'Unknown');
}

function weatherValue(value: unknown, suffix: string): string {
  if (value === null || value === undefined || value === '') return '—';
  const stringValue = String(value);
  return stringValue.includes(suffix) ? stringValue : `${stringValue}${suffix}`;
}

function temperatureLabel(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  const stringValue = String(value).trim();
  if (/°|\b[CF]$/i.test(stringValue)) return stringValue;
  const numericValue = Number(stringValue);
  return `${Number.isFinite(numericValue) ? Math.round(numericValue) : stringValue}°C`;
}

function conversationalCondition(value: string): string {
  const condition = String(value || 'current conditions').trim().replace(/[.!?]+$/, '');
  return condition.charAt(0).toLocaleLowerCase() + condition.slice(1);
}

function forecastTemperature(value: unknown): string {
  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) return `${Math.round(numericValue)}°`;
  const stringValue = String(value ?? '—').trim();
  return stringValue.includes('°') ? stringValue : `${stringValue}°`;
}

function windLabel(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const stringValue = String(value).trim();
  return /(?:km\/h|mph|m\/s)$/i.test(stringValue) ? stringValue : `${stringValue} km/h`;
}

function forecastDayLabel(value: string): string {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return value;
  const date = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return date.toLocaleDateString(undefined, { weekday: 'short' });
}

function weatherEmoji(icon: string | number, label: string): string {
  const rawIcon = String(icon ?? '').trim();
  const existingEmoji = rawIcon.match(/☀️?|🌤️|⛅|☁️?|🌫️|🌦️|🌧️|🌨️|⛈️|❄️|💨|🌪️/u)?.[0];
  if (existingEmoji) return existingEmoji;

  const code = typeof icon === 'number'
    ? icon
    : /^\d+$/.test(rawIcon)
      ? Number(rawIcon)
      : null;

  if (code !== null) {
    if (code === 0) return '☀️';
    if (code === 1) return '🌤️';
    if (code === 2) return '⛅';
    if (code === 3) return '☁️';
    if (code === 45 || code === 48) return '🌫️';
    if ([51, 53, 55, 56, 57].includes(code)) return '🌦️';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '🌧️';
    if ([71, 73, 75, 77, 85, 86].includes(code)) return '🌨️';
    if ([95, 96, 99].includes(code)) return '⛈️';
  }

  const condition = `${rawIcon} ${label}`.toLowerCase();
  if (/thunder|storm|hail/.test(condition)) return '⛈️';
  if (/snow|sleet|ice|blizzard/.test(condition)) return '🌨️';
  if (/shower|drizzle/.test(condition)) return '🌦️';
  if (/rain/.test(condition)) return '🌧️';
  if (/fog|mist|haze/.test(condition)) return '🌫️';
  if (/mainly.?clear|mostly.?clear/.test(condition)) return '🌤️';
  if (/partly|partial|mostly.?cloud/.test(condition)) return '⛅';
  if (/clear|sun/.test(condition)) return '☀️';
  if (/overcast|cloud/.test(condition)) return '☁️';
  if (/wind|gust/.test(condition)) return '💨';
  if (/tornado|cyclone/.test(condition)) return '🌪️';
  return '🌤️';
}

function AgentAvatar({ avatar, name, small = false }: { avatar?: string; name: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [avatar]);

  if (avatar && !failed) {
    return (
      <img
        className={`agent-avatar${small ? ' agent-avatar--small' : ''}`}
        src={avatar}
        alt={small ? '' : `${name} avatar`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`agent-avatar agent-avatar--fallback${small ? ' agent-avatar--small' : ''}`}
      aria-hidden="true"
    >
      <SparkleIcon size={small ? 14 : 20} />
    </span>
  );
}

function PaymentLinkCard({
  card,
  formatCurrency,
  onCopy,
}: {
  card: PaymentLinkAgentCard;
  formatCurrency: (paisa: number) => string;
  onCopy: (url: string) => void;
}) {
  const location = useLocation();
  const href = paymentLinkHref(card.url);
  return (
    <article className="agent-data-card agent-payment-card">
      <div className="agent-data-card-icon"><LinkIcon size={18} /></div>
      <div className="agent-data-card-main">
        <div className="agent-data-card-heading">
          <strong>{amountLabel(card.amount, formatCurrency)}</strong>
          <span className={`agent-card-status status-${statusClass(card.status)}`}>{card.status}</span>
        </div>
        {card.note && <div className="agent-data-card-note">{card.note}</div>}
        <div className="agent-data-card-meta">
          <span className="mono" title={card.token}>{card.token}</span>
          <span>{dateLabel(card.created)}</span>
        </div>
      </div>
      <div className="agent-card-actions">
        {card.url && (
          <button type="button" className="ghost compact" onClick={() => onCopy(card.url)} aria-label="Copy payment link">
            <CopyIcon size={14} />
          </button>
        )}
        {href?.startsWith('/') && (
          <Link className="btn ghost compact" to={href} state={{ backgroundLocation: location }}>Open</Link>
        )}
        {href && !href.startsWith('/') && (
          <a className="btn ghost compact" href={href} target="_blank" rel="noopener noreferrer">
            Open <ExternalIcon size={13} />
          </a>
        )}
      </div>
    </article>
  );
}

function TransactionCard({ card, formatCurrency }: {
  card: TransactionAgentCard;
  formatCurrency: (paisa: number) => string;
}) {
  const location = useLocation();
  const id = String(card.id);
  const reference = String(card.reference);
  return (
    <article className="agent-data-card agent-transaction-card">
      <span className={`agent-transaction-direction${card.sent ? ' sent' : ' received'}`} aria-hidden="true">
        {card.sent ? '↑' : '↓'}
      </span>
      <div className="agent-data-card-main">
        <div className="agent-data-card-heading">
          <Link
            className="agent-transaction-party"
            to={`/i/flow/transaction/${encodeURIComponent(id)}`}
            state={{ backgroundLocation: location }}
          >
            {partyLabel(card.other_party)}
          </Link>
          <strong className={card.sent ? 'agent-amount-sent' : 'agent-amount-received'}>
            {card.sent ? '−' : '+'}{amountLabel(card.amount, formatCurrency)}
          </strong>
        </div>
        <div className="agent-data-card-meta">
          <span><span className="agent-meta-label">ID</span> <span className="mono" title={id}>{id}</span></span>
          <span><span className="agent-meta-label">Reference</span> <span className="mono" title={reference}>{reference}</span></span>
          <span>{dateLabel(card.created)}</span>
          <span className={`agent-card-status status-${statusClass(card.status)}`}>{card.status}</span>
        </div>
      </div>
    </article>
  );
}

function WeatherDay({ day }: { day: WeatherAgentDay }) {
  return (
    <div className="agent-weather-day" title={`${day.date}: ${day.label}`}>
      <div className="agent-weather-day-name">{forecastDayLabel(day.date)}</div>
      <div className="agent-weather-day-icon" aria-hidden="true">{weatherEmoji(day.icon, day.label)}</div>
      <div className="agent-weather-day-temperatures">
        {forecastTemperature(day.high)} / {forecastTemperature(day.low)}
      </div>
      <div className="agent-weather-day-label">{day.label}</div>
    </div>
  );
}

function WeatherCard({ card, summary }: { card: WeatherAgentCard; summary?: string }) {
  const temperature = temperatureLabel(card.temperature);
  const condition = conversationalCondition(card.label);
  const place = `${card.place}${card.flag ? ` ${card.flag}` : ''}`;
  const wind = windLabel(card.wind);
  const conversationalSummary = summary?.trim() || `It's ${temperature} in ${place} right now, with ${condition}.`;

  return (
    <div className="agent-weather-response">
      <div className="agent-weather-summary">
        {conversationalSummary}
      </div>
      <article className="agent-data-card agent-weather-card">
        <div className="agent-weather-current">
          <div className="agent-weather-icon" aria-hidden="true">
            {weatherEmoji(card.icon, card.label)}
          </div>
          <div>
            <strong className="agent-weather-temperature">{temperature}</strong>
            <div className="agent-weather-label">{card.label}</div>
          </div>
        </div>
        <div className="agent-weather-details">
          <span><span aria-hidden="true">🌡️</span> Feels like {temperatureLabel(card.feels_like)}</span>
          <span><span aria-hidden="true">💧</span> {weatherValue(card.humidity, '%')} humidity</span>
          {wind && <span><span aria-hidden="true">💨</span> {wind} wind</span>}
        </div>
        {!!card.days?.length && (
          <div className="agent-weather-forecast" aria-label={`Five-day forecast for ${card.place}`}>
            {card.days.map((day) => <WeatherDay key={day.date} day={day} />)}
          </div>
        )}
      </article>
    </div>
  );
}

function AgentResultView({
  result,
  formatCurrency,
  onCopy,
}: {
  result: AgentResult;
  formatCurrency: (paisa: number) => string;
  onCopy: (url: string) => void;
}) {
  if (result.kind && result.cards?.length) {
    return (
      <div className="agent-card-list">
        {result.kind === 'payment-links' && result.cards.map((card, index) => (
          <PaymentLinkCard key={`${(card as PaymentLinkAgentCard).token}-${index}`} card={card as PaymentLinkAgentCard} formatCurrency={formatCurrency} onCopy={onCopy} />
        ))}
        {result.kind === 'transactions' && result.cards.map((card, index) => (
          <TransactionCard key={`${(card as TransactionAgentCard).id}-${index}`} card={card as TransactionAgentCard} formatCurrency={formatCurrency} />
        ))}
        {result.kind === 'weather' && result.cards.map((card, index) => (
          <WeatherCard
            key={`${(card as WeatherAgentCard).place}-${index}`}
            card={card as WeatherAgentCard}
            summary={index === 0 ? result.message : undefined}
          />
        ))}
      </div>
    );
  }

  if (!result.message) return null;
  return (
    <div className={`agent-result${result.ok ? ' ok' : ' failed'}`}>
      {result.ok ? <CheckIcon size={16} /> : <CloseIcon size={16} />}
      <AgentText text={result.message} />
    </div>
  );
}

function AgentSteps({ message }: { message: AgentMessage }) {
  if (!message.steps?.length) return null;
  return (
    <div className="agent-step-list">
      {message.steps.map((step, index) => (
        <div className="agent-step" key={`${step.label}-${index}`}>
          <div className="agent-step-head">
            <strong>{step.label}</strong>
            <span className={`agent-step-status status-${statusClass(step.status)}`}>{step.status}</span>
          </div>
          <div className="agent-step-description">{step.description}</div>
          {step.note && <div className="agent-step-note">{step.note}</div>}
        </div>
      ))}
    </div>
  );
}

function ConversationMessage({
  message,
  agentName,
  avatar,
  pendingConfirmation,
  busy,
  formatCurrency,
  onConfirm,
  onDecline,
  onCopy,
}: {
  message: AgentMessage;
  agentName: string;
  avatar?: string;
  pendingConfirmation: boolean;
  busy: boolean;
  formatCurrency: (paisa: number) => string;
  onConfirm: () => void;
  onDecline: () => void;
  onCopy: (url: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <div className="agent-message-row user">
        <span className="agent-sender">You</span>
        <div className="agent-msg user"><AgentText text={message.text} /></div>
      </div>
    );
  }

  const hasContent = Boolean(message.text || message.steps?.length || message.results?.length || pendingConfirmation);
  if (!hasContent) return null;

  return (
    <div className="agent-message-row agent">
      <span className="agent-sender">{agentName}</span>
      <AgentAvatar avatar={avatar} name={agentName} small />
      <div className="agent-msg agent">
        {message.text && <AgentText text={message.text} className="agent-message-text" />}
        <AgentSteps message={message} />
        {message.results?.map((result, index) => (
          <AgentResultView key={index} result={result} formatCurrency={formatCurrency} onCopy={onCopy} />
        ))}
        {message.confirmable && (
          pendingConfirmation ? (
            <div className="agent-confirm-actions">
              <button type="button" className="compact" onClick={onConfirm} disabled={busy}>
                <CheckIcon size={14} /> Confirm
              </button>
              <button type="button" className="secondary compact" onClick={onDecline} disabled={busy}>
                <CloseIcon size={14} /> Decline
              </button>
            </div>
          ) : (
            <div className="agent-confirm-state">This request has been resolved.</div>
          )
        )}
      </div>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="agent-loading" aria-label="Loading conversation">
      <div className="agent-skeleton-row">
        <Skeleton width={32} height={32} radius={16} />
        <Skeleton width="58%" height={72} radius={14} />
      </div>
      <div className="agent-skeleton-row user"><Skeleton width="42%" height={44} radius={14} /></div>
      <div className="agent-skeleton-row">
        <Skeleton width={32} height={32} radius={16} />
        <Skeleton width="66%" height={58} radius={14} />
      </div>
    </div>
  );
}

export interface AgentChatProps {
  variant?: 'page' | 'drawer';
  visible?: boolean;
  resetRequest?: number;
  onBusyChange?: (busy: boolean) => void;
}

export function AgentChat({
  variant = 'page',
  visible = true,
  resetRequest = 0,
  onBusyChange,
}: AgentChatProps) {
  const { active } = useAuth();
  const { settings } = useSettings();
  const formatCurrency = useCurrency();
  const toast = useToast();
  const { refetchUserInfo } = useGlobalData();
  const [conversation, setConversation] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [input, setInput] = useState('');
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const loadSequence = useRef(0);
  const lastResetRequest = useRef(resetRequest);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestionMenuRef = useRef<HTMLDivElement>(null);
  const suggestionTriggerRef = useRef<HTMLButtonElement>(null);
  const characterCountId = useId();
  const suggestionMenuId = useId();
  const accountKey = active ? `${active.id}:${active.env}:${active.token}` : '';
  const accountKeyRef = useRef(accountKey);
  accountKeyRef.current = accountKey;

  const loadConversation = useCallback(async () => {
    if (!active || settings.scambait) return;
    const requestAccount = accountKey;
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError(null);
    setConversation(null);
    try {
      const next = await getAgentState(active);
      if (sequence === loadSequence.current && requestAccount === accountKeyRef.current) setConversation(withStateDefaults(next));
    } catch (error) {
      if (sequence === loadSequence.current && requestAccount === accountKeyRef.current) setLoadError(error);
    } finally {
      if (sequence === loadSequence.current && requestAccount === accountKeyRef.current) setLoading(false);
    }
  }, [accountKey, settings.scambait]);

  useEffect(() => {
    setInput('');
    setPendingUser(null);
    setBusy(null);
    setResetOpen(false);
    setSuggestionsOpen(false);
  }, [accountKey]);

  useEffect(() => {
    onBusyChange?.(Boolean(busy));
  }, [busy, onBusyChange]);

  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);

  useEffect(() => {
    if (!suggestionsOpen) return;

    const focusFrame = requestAnimationFrame(() => {
      suggestionMenuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    });

    function onPointerDown(event: PointerEvent) {
      if (!suggestionMenuRef.current?.contains(event.target as Node)) setSuggestionsOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      setSuggestionsOpen(false);
      requestAnimationFrame(() => suggestionTriggerRef.current?.focus());
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [suggestionsOpen]);

  useEffect(() => {
    if (busy || conversation?.awaiting_confirmation || conversation?.awaiting_answer) {
      setSuggestionsOpen(false);
    }
  }, [busy, conversation?.awaiting_confirmation, conversation?.awaiting_answer]);

  useEffect(() => {
    void loadConversation();
    return () => { loadSequence.current += 1; };
  }, [loadConversation]);

  useEffect(() => {
    if (!visible) return;
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [visible, conversation?.transcript.length, conversation?.awaiting_confirmation, pendingUser, busy]);

  useLayoutEffect(() => {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  }, [input]);

  const focusComposer = () => {
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    if (variant !== 'drawer' || !visible || loading || loadError) return;
    if (window.matchMedia?.('(pointer: coarse)').matches) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [variant, visible, loading, loadError]);

  async function showRequestError(error: unknown, requestAccount: string) {
    const { describeError } = await import('../../utils/errors.js');
    if (requestAccount === accountKeyRef.current) toast.error(describeError(error));
  }

  async function send(text: string) {
    if (!active || busy || conversation?.awaiting_confirmation) return;
    const message = text.trim();
    if (!message) return;
    const requestAccount = accountKey;
    const maxLength = conversation?.max_length ?? FALLBACK_MAX_LENGTH;
    if (message.length > maxLength) {
      toast.error(`Keep your message to ${maxLength} characters or fewer.`);
      return;
    }

    setSuggestionsOpen(false);
    setInput('');
    setPendingUser(message);
    setBusy('message');
    try {
      const next = await sendAgentMessage(active, message);
      if (requestAccount !== accountKeyRef.current) return;
      setConversation((previous) => mergeTurn(previous, next, { role: 'user', text: message }));
      setPendingUser(null);
      if (responseHasSuccessfulWrite(next)) void refetchUserInfo();
    } catch (error) {
      if (requestAccount !== accountKeyRef.current) return;
      setPendingUser(null);
      setInput((current) => current || message);
      await showRequestError(error, requestAccount);
    } finally {
      if (requestAccount === accountKeyRef.current) {
        setBusy(null);
        focusComposer();
      }
    }
  }

  async function resolveAction(confirm: boolean) {
    if (!active || busy || !conversation?.awaiting_confirmation) return;
    const requestAccount = accountKey;
    setBusy(confirm ? 'confirm' : 'decline');
    try {
      const next = confirm ? await confirmAgentAction(active) : await declineAgentAction(active);
      if (requestAccount !== accountKeyRef.current) return;
      setConversation((previous) => mergeTurn(previous, next));
      if (responseHasSuccessfulWrite(next)) void refetchUserInfo();
    } catch (error) {
      if (requestAccount !== accountKeyRef.current) return;
      await showRequestError(error, requestAccount);
    } finally {
      if (requestAccount === accountKeyRef.current) setBusy(null);
    }
  }

  async function resetConversation() {
    if (!active || busy || loading) return;
    const requestAccount = accountKey;
    setResetOpen(false);
    setBusy('reset');
    try {
      const next = await resetAgentConversation(active);
      if (requestAccount !== accountKeyRef.current) return;
      setConversation((previous) => withStateDefaults(next, previous));
      setInput('');
      setPendingUser(null);
      toast.success('Started a new conversation.');
    } catch (error) {
      if (requestAccount !== accountKeyRef.current) return;
      await showRequestError(error, requestAccount);
    } finally {
      if (requestAccount === accountKeyRef.current) setBusy(null);
    }
  }

  useEffect(() => {
    if (resetRequest === lastResetRequest.current) return;
    lastResetRequest.current = resetRequest;
    setResetOpen(true);
  }, [resetRequest]);

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Payment link copied.');
    } catch {
      toast.error('Your browser refused to copy the link.');
    }
  }

  const isDrawer = variant === 'drawer';

  if (settings.scambait) return isDrawer ? null : <h1 className="mt-0">Page unavailable</h1>;

  const transcript = conversation?.transcript ?? [];
  const maxLength = conversation?.max_length ?? FALLBACK_MAX_LENGTH;
  const agentName = conversation?.agent?.short_name || 'Agent';
  const fullAgentName = conversation?.agent?.name || 'MyAgentIndia';
  const avatar = conversation?.agent?.avatar;
  const composerDisabled = loading || Boolean(loadError) || Boolean(busy) || Boolean(conversation?.awaiting_confirmation);
  const showSuggestionMenu = !loading
    && !loadError
    && transcript.length > 0
    && !conversation?.awaiting_confirmation
    && !conversation?.awaiting_answer
    && Boolean(conversation?.suggestions.length);
  let pendingConfirmationIndex = -1;
  if (conversation?.awaiting_confirmation) {
    for (let index = transcript.length - 1; index >= 0; index -= 1) {
      if (transcript[index].role === 'agent' && transcript[index].confirmable) {
        pendingConfirmationIndex = index;
        break;
      }
    }
  }

  const thinkingLabel = busy === 'confirm'
    ? `${agentName} is working...`
    : busy === 'decline'
      ? 'Declining...'
      : busy === 'reset'
        ? 'One moment...'
        : `${agentName} is thinking...`;

  return (
    <div className={`agent-page${isDrawer ? ' agent-page--drawer' : ''}`}>
      {!isDrawer && (
        <header className="agent-page-header">
          <div className="agent-identity">
            <AgentAvatar avatar={avatar} name={agentName} />
            <div>
              <h1>MyAgentIndia</h1>
              <div className="agent-identity-name" title={fullAgentName}>
                {loading ? <><span className="spinner" /> Retrieving data...</> : `You're chatting with ${agentName}.`}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="ghost compact"
            onClick={() => setResetOpen(true)}
            disabled={loading || Boolean(busy) || transcript.length === 0}
          >
            Reset chat
          </button>
        </header>
      )}

      <section className={`agent-shell${isDrawer ? ' agent-shell--drawer' : ''}`} aria-label={`Conversation with ${agentName}`}>
        <div className="agent-scroll" ref={scrollRef} role="log" aria-live="polite" aria-relevant="additions text" aria-busy={loading || Boolean(busy)}>
          {loading && (
            isDrawer ? (
              <div className="agent-drawer-loading" role="status" aria-label="Loading conversation">
                <span className="spinner" />
              </div>
            ) : (
              <ConversationSkeleton />
            )
          )}

          {!loading && Boolean(loadError) && (
            <div className="agent-load-error">
              <ErrorBox error={loadError} />
              <button type="button" className="secondary" onClick={() => void loadConversation()}>Retry</button>
            </div>
          )}

          {!loading && !loadError && transcript.length === 0 && !pendingUser && (
            <div className="agent-empty">
              <AgentAvatar avatar={avatar} name={agentName} />
              <h2>{agentName}</h2>
              {conversation?.greeting && <AgentText text={conversation.greeting} className="agent-greeting" />}
              {!conversation?.awaiting_answer && !!conversation?.suggestions.length && (
                <div className="agent-suggestions" aria-label="Suggested messages">
                  {conversation.suggestions.map((suggestion) => (
                    <button key={suggestion} type="button" className="agent-suggestion" onClick={() => void send(suggestion)} disabled={Boolean(busy)}>
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !loadError && transcript.map((message, index) => (
            <ConversationMessage
              key={`${message.role}-${index}`}
              message={message}
              agentName={agentName}
              avatar={avatar}
              pendingConfirmation={index === pendingConfirmationIndex}
              busy={Boolean(busy)}
              formatCurrency={formatCurrency}
              onConfirm={() => void resolveAction(true)}
              onDecline={() => void resolveAction(false)}
              onCopy={(url) => void copyLink(url)}
            />
          ))}

          {pendingUser && (
            <div className="agent-message-row user agent-message-pending">
              <span className="agent-sender">You</span>
              <div className="agent-msg user"><AgentText text={pendingUser} /></div>
            </div>
          )}

          {busy && busy !== 'reset' && (
            <div className="agent-thinking"><span className="spinner" /> {thinkingLabel}</div>
          )}
        </div>

        <form className="agent-composer" onSubmit={(event) => { event.preventDefault(); void send(input); }}>
          <div className="agent-composer-input">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                  event.preventDefault();
                  void send(input);
                }
              }}
              placeholder={
                conversation?.awaiting_confirmation
                  ? 'Confirm or decline the action above'
                  : conversation?.awaiting_answer
                    ? 'Type your answer…'
                    : busy
                      ? 'Please wait...'
                      : `Message ${agentName}...`
              }
              rows={1}
              maxLength={maxLength}
              disabled={composerDisabled}
              aria-label={`Message ${agentName}`}
              aria-describedby={characterCountId}
            />
            <span id={characterCountId} className={`agent-character-count${input.length >= maxLength * 0.8 ? ' near-limit' : ''}`}>
              {input.length}/{maxLength}
            </span>
            {showSuggestionMenu && (
              <div className="agent-suggestion-menu" ref={suggestionMenuRef}>
                <button
                  ref={suggestionTriggerRef}
                  type="button"
                  className="agent-suggestion-trigger secondary"
                  onClick={() => setSuggestionsOpen((open) => !open)}
                  disabled={composerDisabled}
                  aria-label={suggestionsOpen ? 'Hide suggested messages' : 'Show suggested messages'}
                  aria-haspopup="menu"
                  aria-expanded={suggestionsOpen}
                  aria-controls={suggestionMenuId}
                  title={suggestionsOpen ? 'Hide suggested messages' : 'Show suggested messages'}
                >
                  <BulbIcon size={15} />
                </button>
                {suggestionsOpen && (
                  <div
                    id={suggestionMenuId}
                    className="agent-suggestion-flyout"
                    role="menu"
                    aria-label="Suggested messages"
                    onKeyDown={(event) => {
                      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                      const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
                      if (!items.length) return;
                      event.preventDefault();
                      const current = items.indexOf(document.activeElement as HTMLButtonElement);
                      const next = event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? items.length - 1
                          : event.key === 'ArrowDown'
                            ? (current + 1) % items.length
                            : (current <= 0 ? items.length : current) - 1;
                      items[next]?.focus();
                    }}
                  >
                    {conversation?.suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        role="menuitem"
                        className="agent-suggestion-option"
                        onClick={() => {
                          setSuggestionsOpen(false);
                          void send(suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <button type="submit" disabled={composerDisabled || !input.trim()}>
            {busy === 'message' ? <><span className="spinner" /></> : 'Send'}
          </button>
        </form>
      </section>

      <ConfirmModal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => void resetConversation()}
        title="Reset conversation"
        message="Really reset your chat? All messages will be lost."
      />
    </div>
  );
}

export default function AgentPage() {
  usePageTitle('Agent');
  return <AgentChat variant="page" />;
}
