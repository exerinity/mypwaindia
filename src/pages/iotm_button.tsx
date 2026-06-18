import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { useApiCall } from '../hooks/api_call.js';
import { API_BASE } from '../api/config.js';
import { checkSubscription, createSubscribeSession } from '../api/subscribe.js';
import { ArrowLeftIcon, ExternalIcon, ChevronRight, ErrorIcon } from '../components/icons.tsx';
import { ErrorBox, Skeleton } from '../components/status.tsx';
import { Modal } from '../components/modal.tsx';
import { ConfirmModal } from '../components/confirm_modal.tsx';
import { FloatingInput } from '../components/floating_input.tsx';
import { formatPaisa } from '../utils/money.js';
import { describeError } from '../utils/errors.js';
import { hideGet, hideSet } from '../utils/storage.ts';

const MIN_CLICK_DELAY_MS = 100;
const CLICK_BATCH_SIZE = 10;
const PAYOUT_EVERY = 100;

interface ButtonState {
  balance: string;
  clicks: number;
  payout_in: number;
  leaderboard: string;
}

interface ClickResponse {
  success: boolean;
  data?: {
    clicks: number;
    payout_in: number;
    balance: string;
    leaderboard: string;
  };
  message?: string;
}

interface LeaderEntry {
  rank: string;
  user: string;
  clicks: string;
}

function AnimatedNumber({ value, format = (n: number) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const [displayed, setDisplayed] = useState(value);
  const displayedRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = displayedRef.current;
    const to = value;
    if (from === to) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const duration = 600;
    const start = performance.now();
    function step(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      displayedRef.current = current;
      setDisplayed(current);
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <>{format(displayed)}</>;
}

function SlotBalance({ value }: { value: string }) {
  return (
    <span style={{ display: 'inline-flex', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {value.split('').map((char, i) => {
        const isDigit = /\d/.test(char);
        return (
          <span key={i} style={{ overflow: 'hidden', height: '1em' }}>
            {isDigit
              ? <span key={char} style={{ display: 'block', animation: 'slot-roll 0.22s cubic-bezier(0.2, 0, 0.2, 1)' }}>{char}</span>
              : char
            }
          </span>
        );
      })}
    </span>
  );
}

function parseLeaderboardHtml(html: string): { globalClicks: string; entries: LeaderEntry[] } {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const p = doc.querySelector('p');
  const globalClicks = p?.textContent?.replace('Global clicks:', '').trim() ?? '';
  const rows = doc.querySelectorAll('tbody tr');
  const entries: LeaderEntry[] = [];
  rows.forEach((row) => {
    const rank = row.querySelector('.rank-col')?.textContent?.trim() ?? '';
    const userEl = row.querySelector('.user-col');
    const user = (userEl?.firstChild?.textContent ?? userEl?.textContent ?? '').trim();
    const clicks = row.querySelector('.balance-col')?.textContent?.trim() ?? '';
    if (rank && user && clicks) entries.push({ rank, user, clicks });
  });
  return { globalClicks, entries };
}

interface MathQuestion { display: string; answer: bigint }

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function addSub(min: number, max: number): MathQuestion {
  const op = pick(['+', '−']);
  let x = randInt(min, max);
  let y = randInt(min, max);
  if (op === '−' && y > x) { const t = x; x = y; y = t; }
  return { display: `${x} ${op} ${y}`, answer: BigInt(op === '+' ? x + y : x - y) };
}

function divExact(maxDivisor: number, maxQuotient: number): MathQuestion {
  const d = randInt(2, maxDivisor);
  const q = randInt(2, maxQuotient);
  return { display: `${d * q} ÷ ${d}`, answer: BigInt(q) };
}

function mult(aMin: number, aMax: number, bMin: number, bMax: number): MathQuestion {
  const a = randInt(aMin, aMax);
  const b = randInt(bMin, bMax);
  return { display: `${a} × ${b}`, answer: BigInt(a * b) };
}

function prodCombo(min: number, max: number, cMax: number): MathQuestion {
  const a = randInt(min, max);
  const b = randInt(min, max);
  const op = pick(['+', '−']);
  const c = randInt(2, cMax);
  return { display: `${a} × ${b} ${op} ${c}`, answer: BigInt(op === '+' ? a * b + c : a * b - c) };
}

function twoProducts(min: number, max: number): MathQuestion {
  let a = randInt(min, max), b = randInt(min, max), c = randInt(min, max), d = randInt(min, max);
  const op = pick(['+', '−']);
  let p1 = a * b, p2 = c * d;
  if (op === '−' && p2 > p1) { [a, b, c, d] = [c, d, a, b]; [p1, p2] = [p2, p1]; }
  return { display: `${a} × ${b} ${op} ${c} × ${d}`, answer: BigInt(op === '+' ? p1 + p2 : p1 - p2) };
}

function brutal(): MathQuestion {
  const a = BigInt(randInt(10000, 99999));
  const b = BigInt(randInt(10000, 99999));
  const base = BigInt(randInt(40, 99));
  const exp = BigInt(randInt(7, 9));
  const power = base ** exp;
  const prod = a * b;
  if (pick(['+', '−']) === '+') {
    return { display: `${a} × ${b} + ${base}^${exp}`, answer: prod + power };
  }
  return { display: `${base}^${exp} − ${a} × ${b}`, answer: power - prod };
}

function makeQuestions(): MathQuestion[] {
  return [
    addSub(2, 9),
    pick([() => addSub(10, 99), () => divExact(9, 12)])(),
    pick([() => mult(12, 99, 12, 99), () => prodCombo(12, 99, 99), () => divExact(15, 80)])(),
    pick([() => mult(101, 999, 101, 999), () => twoProducts(101, 999), () => prodCombo(101, 999, 999)])(),
    brutal(),
  ];
}

const QUESTION_SECONDS = 45;

const NO_SELECT: React.CSSProperties = { userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none' };

function UnlockModal({ open, onClose, onUnlock, onSubscribe, subscribing }: {
  open: boolean;
  onClose: () => void;
  onUnlock: () => void;
  onSubscribe: () => void;
  subscribing: boolean;
}) {
  const toast = useToast();
  const [step, setStep] = useState<'choice' | 'math'>('choice');
  const [questions, setQuestions] = useState<MathQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const boxRef = useRef<HTMLDivElement>(null);

  const timeLeft = deadline === null ? QUESTION_SECONDS : Math.max(0, Math.ceil((deadline - now) / 1000));

  useEffect(() => {
    if (step !== 'math' || !open || deadline === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [step, open, deadline]);

  function reset() {
    setStep('choice');
    setQuestions([]);
    setCurrent(0);
    setAnswer('');
    setError(null);
    setDeadline(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function failAndRestart(msg: string) {
    setQuestions(makeQuestions());
    setCurrent(0);
    setAnswer('');
    setError(msg);
    setDeadline(null);
    setNow(Date.now());
  }

  function beginQuestion() {
    setDeadline(Date.now() + QUESTION_SECONDS * 1000);
    setNow(Date.now());
  }

  useEffect(() => {
    if (step === 'math' && open && deadline !== null && timeLeft <= 0) {
      failAndRestart('Out of time! Back to question 1.');
    }
  }, [timeLeft, step, open, deadline]);

  useEffect(() => {
    if (step !== 'math' || !open || deadline === null) return;
    function onBlur() {
      setDeadline((d) => (d === null ? d : d - 15000));
      setNow(Date.now());
      toast.warning('Focus has been lost, shaving off 15 seconds');
    }
    window.addEventListener('blur', onBlur);
    return () => window.removeEventListener('blur', onBlur);
  }, [step, open, deadline]);

  function selectionTampered() {
    const box = boxRef.current;
    if (!box) return false;
    try {
      const cs = getComputedStyle(box);
      const us = cs.userSelect || (cs as unknown as Record<string, string>).webkitUserSelect;
      return !!us && us !== 'none';
    } catch {
      return false;
    }
  }

  useEffect(() => {
    if (step !== 'math' || !open) return;
    const id = setInterval(() => {
      const start = performance.now();
      debugger;
      if (performance.now() - start > 120) {
        failAndRestart('You opened DevTools, back to question 1!');
        return;
      }
      if (selectionTampered()) {
        failAndRestart('Tampering detected, back to question 1!');
      }
    }, 150);
    return () => clearInterval(id);
  }, [step, open]);

  useEffect(() => {
    if (step !== 'math' || !open) return;
    const box = boxRef.current;
    if (!box || typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => {
      if (selectionTampered()) {
        failAndRestart('Tampering detected, back to question 1!');
      }
    });
    obs.observe(box, { attributes: true, attributeFilter: ['style', 'class'] });
    return () => obs.disconnect();
  }, [step, open]);

  function startMath() {
    setQuestions(makeQuestions());
    setCurrent(0);
    setAnswer('');
    setError(null);
    setDeadline(null);
    setNow(Date.now());
    setStep('math');
  }

  function submitAnswer(ev: React.FormEvent) {
    ev.preventDefault();
    const q = questions[current];
    let correct = false;
    try { correct = BigInt(answer.replace(/[\s,]/g, '')) === q.answer; } catch { correct = false; }
    if (!correct) {
      failAndRestart('Wrong. Back to question 1!');
      return;
    }
    if (current >= questions.length - 1) {
      onUnlock();
      handleClose();
      return;
    }
    setCurrent(current + 1);
    setAnswer('');
    setError(null);
    setDeadline(Date.now() + QUESTION_SECONDS * 1000);
    setNow(Date.now());
  }

  return (
    <Modal open={open} onClose={handleClose} className="slide">
      {step === 'choice' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button className="option" onClick={startMath} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className="option-label">Answer 5 math questions</span>
              <span className="option-desc">for this session only</span>
            </div>
            <ChevronRight />
          </button>
          <button className="option" onClick={onSubscribe} disabled={subscribing} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span className="option-label">Subscribe for 50 INR a week</span>
              <span className="option-desc">{subscribing ? 'Taking you to MyPayIndia...' : 'through MyPayIndia'}</span>
            </div>
            <ExternalIcon />
          </button>
        </div>
      ) : (
        <div>
          <p className="muted" style={{ marginTop: 0, fontSize: '0.875rem' }}>
            Solve all 5 questions to unlock the autoclicker. You get {QUESTION_SECONDS} seconds per question, and a single wrong answer (or running out of time) restarts everything. If you try cheating, you also restart. You cannot open DevTools or select the equation with this modal open. If the page loses focus (e.g., opening a calculator), 15 seconds are shaved off. Oh, and if you leave the button, you have to do this again. Have fun!
          </p>
          <div className="row spread" style={{ alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)' }}>
              Question {current + 1} of {questions.length}
            </span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: timeLeft <= 10 ? 'var(--error, #ef4444)' : 'var(--muted)' }}>
              {timeLeft}s
            </span>
          </div>
          <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
            {questions.map((_, i) => (
              <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: i < current ? 'var(--success, #22c55e)' : i === current ? 'var(--brand)' : 'var(--border)' }} />
            ))}
          </div>
          <form onSubmit={submitAnswer}>
            <div
              ref={boxRef}
              onClick={() => { if (deadline === null) beginQuestion(); }}
              style={{ ...NO_SELECT, background: 'var(--card-soft)', border: '1px solid var(--border)', borderRadius: 8, padding: '20px 16px', fontSize: '1.45rem', fontWeight: 700, textAlign: 'center', fontVariantNumeric: 'tabular-nums', marginBottom: 14, wordBreak: 'break-word', cursor: deadline === null ? 'pointer' : 'default' }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {deadline === null ? 'Click to begin' : `${questions[current]?.display} = ?`}
            </div>
            <FloatingInput
              label="Your answer"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={deadline === null}
              autoFocus
              required
            />
            {error && (
              <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ErrorIcon /><span>{error}</span>
              </div>
            )}
            <div className="btn-row">
              <button type="button" className="secondary" onClick={reset}>
                Go back and subscribe
              </button>
              <button type="submit" disabled={deadline === null}>
                {current >= questions.length - 1 ? 'Finish' : 'Submit answer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}

export default function IotmButtonPage() {
  usePageTitle('Button');
  const { active, updateBalance } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [pendingNav, setPendingNav] = useState<string | null>(null);

  const [state, setState] = useState<ButtonState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayClicks, setDisplayClicks] = useState(0);
  const [displayPayoutIn, setDisplayPayoutIn] = useState(0);

  const localClicks = useRef(0);
  const localPayoutIn = useRef(0);
  const lastClickTime = useRef(0);
  const tempClicks = useRef(0);
  const recentClickTimes = useRef<number[]>([]);
  const [, forceUpdate] = useState(0);
  const nextRefreshAt = useRef(0);
  const autoClickingRef = useRef(false);
  const [use24h, setUse24h] = useState(false);
  const leaderboardSnapshots = useRef<Map<string, number>[]>([]);
  const [activeUsers, setActiveUsers] = useState<Set<string>>(new Set());
  const [showDotModal, setShowDotModal] = useState(false);
  const [dotHintDismissed, setDotHintDismissed] = useState(() => hideGet('clickers'));
  const [showWelcomeModal, setShowWelcomeModal] = useState(() => !hideGet('iotm_welcome'));
  const [connectionLost, setConnectionLost] = useState(false);
  const failedRequests = useRef(0);
  const pendingAutoResume = useRef(false);

  useEffect(() => {
    if (!active?.token) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/accountservices/iotm/button/?minimal`, {
      headers: { Authorization: `Bearer ${active.token}` },
      credentials: 'include',
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.text();
      })
      .then((html) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const balance = doc.querySelector('#balance')?.textContent?.trim() ?? '0';
        const clicks = parseInt(doc.querySelector('#click_counter')?.textContent?.trim() ?? '0', 10);
        const payout_in = parseInt(doc.querySelector('#payout_counter')?.textContent?.trim() ?? '0', 10);
        const leaderboard = doc.querySelector('#click_leaderboard')?.innerHTML ?? '';

        setState({ balance, clicks, payout_in, leaderboard });
        localClicks.current = clicks;
        localPayoutIn.current = payout_in;
        setDisplayClicks(clicks);
        setDisplayPayoutIn(payout_in);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e : new Error(String(e)));
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [active?.token]);

  useEffect(() => {
    if (!active?.token) return;
    nextRefreshAt.current = Date.now() + 10000;
    const id = setInterval(() => {
      const now = Date.now();
      const recentClicks = recentClickTimes.current.filter((t) => t > now - 2000);
      const clicking = autoClickingRef.current || recentClicks.length > 0;
      if (clicking) {
        nextRefreshAt.current = now + 10000;
        return;
      }
      if (now < nextRefreshAt.current) return;
      nextRefreshAt.current = now + 10000;
      fetch(`${API_BASE}/accountservices/iotm/button/?minimal`, {
        headers: { Authorization: `Bearer ${active.token}` },
        credentials: 'include',
      })
        .then((r) => r.ok ? r.text() : Promise.reject())
        .then((html) => {
          failedRequests.current = 0;
          setConnectionLost(false);
          if (pendingAutoResume.current) {
            pendingAutoResume.current = false;
            setAutoClicking(true);
            setAutoClickStatus('active');
            toast.info('Autoclicker resumed');
          }
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const leaderboard = doc.querySelector('#click_leaderboard')?.innerHTML ?? '';
          setState((s) => s ? { ...s, leaderboard } : s);
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(id);
  }, [active?.token]);

  const sendBatch = useCallback(() => {
    if (!active?.token) return;
    tempClicks.current = 0;

    fetch(`${API_BASE}/accountservices/iotm/button/?click`, {
      headers: { Authorization: `Bearer ${active.token}`, Accept: 'application/json' },
      credentials: 'include',
    })
      .then((r) => r.json() as Promise<ClickResponse>)
      .then((res) => {
        failedRequests.current = 0;
        setConnectionLost(false);
        if (pendingAutoResume.current) {
          pendingAutoResume.current = false;
          setAutoClicking(true);
          setAutoClickStatus('active');
          toast.info('Autoclicker resumed');
        }
        if (res.success && res.data) {
          const { clicks, payout_in, balance, leaderboard } = res.data;
          const apply = () => {
            setState((s) => ({ ...s!, balance, clicks, payout_in, leaderboard: leaderboard ?? s?.leaderboard ?? '' }));
            localClicks.current = clicks;
            localPayoutIn.current = payout_in;
            setDisplayClicks(clicks);
            setDisplayPayoutIn(payout_in);
            const rupees = parseFloat(balance.replace(/,/g, ''));
            if (!isNaN(rupees) && active) updateBalance(active.id, Math.round(rupees * 100));
          };
          if (clicks < localClicks.current || clicks - localClicks.current >= 15) {
            setDesync(true);
            setTimeout(() => {
              apply();
              setDesync(false);
            }, 700);
          } else {
            apply();
          }
        } else {
          toast.error((res.message ?? 'Unknown error'));
        }
      })
      .catch((e: unknown) => {
        console.error('Button click error:', e);
        failedRequests.current++;
        if (failedRequests.current > 3) {
          setConnectionLost(true);
          if (autoClickingRef.current) pendingAutoResume.current = true;
          setAutoClicking(false);
          setAutoClickStatus('paused');
        }
      });
  }, [active, updateBalance]);

  function recordClick() {
    const t = Date.now();
    recentClickTimes.current = [...recentClickTimes.current, t].filter((x) => x > t - 5000);
  }

  function handleButtonClick() {
    if (autoClickingRef.current) {
      setAutoClicking(false);
      setAutoClickStatus('paused');
      toast.info('Autoclicker interrupted, pausing...');
      return;
    }
    const now = Date.now();
    if (now - lastClickTime.current <= MIN_CLICK_DELAY_MS) return;
    pendingAutoResume.current = false;
    lastClickTime.current = now;
    recordClick();

    tempClicks.current++;
    localClicks.current++;
    localPayoutIn.current = localPayoutIn.current > 1 ? localPayoutIn.current - 1 : PAYOUT_EVERY;

    setDisplayClicks(localClicks.current);
    setDisplayPayoutIn(localPayoutIn.current);

    if (tempClicks.current >= CLICK_BATCH_SIZE) {
      sendBatch();
    }
  }

  const [autoClicking, setAutoClicking] = useState(false);
  const [autoClickStatus, setAutoClickStatus] = useState<'none' | 'active' | 'paused'>('none');
  const autoClickStatusRef = useRef(autoClickStatus);
  const [desync, setDesync] = useState(false);
  useEffect(() => { autoClickingRef.current = autoClicking; }, [autoClicking]);
  useEffect(() => { autoClickStatusRef.current = autoClickStatus; }, [autoClickStatus]);

  const subQ = useApiCall(
    () => checkSubscription(active!.token),
    [active?.token],
    { skip: !active?.token }
  );
  const [mathUnlocked, setMathUnlocked] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const hasAccess = !!subQ.data?.subscribed || mathUnlocked;
  const hasAccessRef = useRef(hasAccess);
  useEffect(() => { hasAccessRef.current = hasAccess; }, [hasAccess]);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (!hasAccess && autoClicking) {
      setAutoClicking(false);
      setAutoClickStatus('none');
    }
  }, [hasAccess, autoClicking]);

  useEffect(() => {
    if (!autoClicking) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [autoClicking]);

  useEffect(() => {
    if (!autoClicking) return;
    function onClickCapture(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a');
      if (!anchor) return;
      const targetAttr = anchor.getAttribute('target');
      if (!anchor.getAttribute('href') || (targetAttr && targetAttr !== '_self') || anchor.hasAttribute('download')) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.origin); } catch { return; }
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      e.preventDefault();
      e.stopPropagation();
      setPendingNav(url.pathname + url.search + url.hash);
    }
    document.addEventListener('click', onClickCapture, true);
    return () => document.removeEventListener('click', onClickCapture, true);
  }, [autoClicking]);

  function confirmLeave() {
    const to = pendingNav;
    setPendingNav(null);
    setAutoClicking(false);
    setAutoClickStatus('none');
    if (to) navigate(to);
  }

  function toggleAutoclicker() {
    if (!hasAccessRef.current) return;
    pendingAutoResume.current = false;
    if (autoClicking) {
      setAutoClicking(false);
      setAutoClickStatus('none');
      return;
    }
    if (autoClickStatus === 'paused') {
      setAutoClicking(true);
      setAutoClickStatus('active');
      toast.info('Autoclicker resumed');
      return;
    }
    const id = toast.push('Activate autoclicker?', 'info', 0, { label: 'Yes', onClick: () => {
      setAutoClicking(true);
      setAutoClickStatus('active');
      toast.remove(id);
      toast.success('Autoclicker active. To stop, double click BALANCE again or interrupt it');
    } });
  }

  async function startSubscribe() {
    if (!active) return;
    setSubscribing(true);
    try {
      const { checkout_url } = await createSubscribeSession(active.token);
      window.location.href = checkout_url;
    } catch (e) {
      toast.error(describeError(e));
      setSubscribing(false);
    }
  }

  const autoClick = useCallback(() => {
    recordClick();
    tempClicks.current++;
    localClicks.current++;
    localPayoutIn.current = localPayoutIn.current > 1 ? localPayoutIn.current - 1 : PAYOUT_EVERY;
    setDisplayClicks(localClicks.current);
    setDisplayPayoutIn(localPayoutIn.current);
    if (tempClicks.current >= CLICK_BATCH_SIZE) sendBatch();
  }, [sendBatch]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && e.key === 'x') {
        e.preventDefault();
        if (!hasAccessRef.current) return;
        pendingAutoResume.current = false;
        const next = !autoClickingRef.current;
        setAutoClicking(next);
        setAutoClickStatus(next ? 'active' : 'none');
        if (next && autoClickStatusRef.current === 'paused') toast.info('Autoclicker resumed');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!autoClicking || !active?.token) return;
    const id = setInterval(autoClick, 150);
    return () => clearInterval(id);
  }, [autoClicking, active?.token, autoClick]);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!state?.leaderboard) return;
    const parsed = parseLeaderboardHtml(state.leaderboard);
    const snapshot = new Map<string, number>();
    parsed.entries.forEach((e) => snapshot.set(e.user, parseInt(e.clicks.replace(/,/g, ''), 10)));
    const history = leaderboardSnapshots.current;
    history.push(snapshot);
    if (history.length > 5) history.shift();
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const next = new Set<string>();
      newest.forEach((newClicks, user) => {
        const oldClicks = oldest.get(user);
        if (oldClicks !== undefined && newClicks > oldClicks) next.add(user);
      });
      setActiveUsers(next);
    }
  }, [state?.leaderboard]);

  const payoutPct = displayPayoutIn <= 0
    ? 100
    : (displayPayoutIn / PAYOUT_EVERY) * 100;

  const leaderboard = state ? parseLeaderboardHtml(state.leaderboard) : null;

  return (
    <>
      <h1 className="mt-0">Button</h1>

      <div className="card" style={{ marginBottom: '1rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Skeleton height={14} style={{ width: '30%' }} />
            <Skeleton height={38} style={{ width: '55%' }} />
            <Skeleton height={16} style={{ width: '60%', marginTop: 8 }} />
            <Skeleton height={52} style={{ width: '100%', marginTop: 4 }} />
          </div>
        ) : error ? (
          <ErrorBox error={error} />
        ) : (
          <>
            <p
              style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 4px', userSelect: 'none' }}
              onDoubleClick={toggleAutoclicker}
            >
              Balance
              {(() => {
                const indicatorStyle: React.CSSProperties = { float: 'right', fontSize: '0.72rem', textTransform: 'none', letterSpacing: 'normal', fontWeight: 400 };
                if (subQ.loading) {
                  return <span style={indicatorStyle}>Loading...</span>;
                }
                if (!hasAccess) {
                  return (
                    <span
                      style={{ ...indicatorStyle, cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={(e) => { e.stopPropagation(); setUnlockModalOpen(true); }}
                    >
                      Unlock access to autoclicker
                    </span>
                  );
                }
                if (autoClickStatus !== 'none') {
                  return (
                    <span
                      style={{ ...indicatorStyle, ...(autoClickStatus === 'paused' && { cursor: 'pointer' }) }}
                      onClick={(e) => {
                        if (autoClickStatus !== 'paused') return;
                        e.stopPropagation();
                        pendingAutoResume.current = false;
                        setAutoClicking(true);
                        setAutoClickStatus('active');
                        toast.info('Autoclicker resumed');
                      }}
                    >
                      {autoClickStatus === 'active' ? 'Autoclicker active' : 'Autoclicker interrupted - click here to resume'}
                    </span>
                  );
                }
                return (
                  <span
                    style={{ ...indicatorStyle, cursor: 'pointer', textDecoration: 'underline' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      pendingAutoResume.current = false;
                      setAutoClicking(true);
                      setAutoClickStatus('active');
                      toast.success('Autoclicker active. To stop, double click BALANCE again or interrupt it');
                    }}
                  >
                    Activate autoclicker
                  </span>
                );
              })()}
            </p>
            {desync || connectionLost ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '0 0 20px' }}>
                <Skeleton height={34} style={{ width: '55%' }} />
              </div>
            ) : (
              <p style={{ fontSize: '2.1rem', fontWeight: 700, margin: '0 0 20px', lineHeight: 1.2 }}>
                <SlotBalance value={state ? formatPaisa(Math.round(parseFloat(state.balance.replace(/,/g, '')) * 100)) : '0.00'} />&nbsp;
                <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted)' }}>INR</span>
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <span style={{ fontWeight: 600 }}>
                Your clicks: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayClicks.toLocaleString()}</span>
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                <span style={{ color: 'var(--success, #22c55e)' }}>+0.01 INR</span>
                {' '}in{' '}
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{displayPayoutIn}</span> clicks
              </span>
            </div>

            <button
              className="primary the_button"
              style={{ '--payout-percentage': `${payoutPct}%`, width: '100%', padding: '14px 0', fontSize: '1.1rem' } as React.CSSProperties}
              onClick={handleButtonClick}
            >
              Button
            </button>

            {(() => {
              if (connectionLost) return (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" />
                  Connection lost, waiting for reconnection...
                </p>
              );
              if (desync) return (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '12px 0 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="spinner" />
                  Syncing with the server... one moment
                </p>
              );
              if (!leaderboard) return null;
              const myIndex = leaderboard.entries.findIndex((e) => e.user === active?.username);
              if (myIndex === -1) return (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '12px 0 0' }}>
                  You are not yet on the clickerboard
                </p>
              );
              const myRank = leaderboard.entries[myIndex].rank;
              if (myIndex === 0) return (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '12px 0 0' }}>
                  You are <strong style={{ color: 'var(--fg)' }}>#{myRank}</strong> on the clickerboard
                </p>
              );
              const above = leaderboard.entries[myIndex - 1];
              const aboveClicks = parseInt(above.clicks.replace(/,/g, ''), 10);
              const gap = Math.max(aboveClicks - displayClicks + 1, 0);
              const nowTs = Date.now();
              const recent = recentClickTimes.current.filter((t) => t > nowTs - 3000);
              const isActive = autoClicking || (recent.length > 0 && nowTs - recent[recent.length - 1] < 3000);
              const cps = autoClicking ? 10 : (recent.length > 1 ? (recent.length - 1) / 3 : 0);
              const secsLeft = isActive && cps > 0 ? gap / cps : null;
              function fmtDuration(s: number) {
                const d = Math.floor(s / 86400);
                const h = Math.floor((s % 86400) / 3600);
                const m = Math.floor((s % 3600) / 60);
                const sec = Math.floor(s % 60);
                const parts = [];
                if (d > 0) parts.push(`${d}d`);
                if (h > 0) parts.push(`${h}h`);
                if (m > 0) parts.push(`${m}m`);
                parts.push(`${sec}s`);
                return parts.join(' ');
              }
              function fmtEta(ms: number) {
                const eta = new Date(ms);
                const today = new Date();
                const isToday = eta.getDate() === today.getDate() && eta.getMonth() === today.getMonth() && eta.getFullYear() === today.getFullYear();
                const timeStr = eta.toLocaleTimeString([], use24h
                  ? { hour: '2-digit', minute: '2-digit', hour12: false }
                  : { hour: 'numeric', minute: '2-digit', hour12: true });
                if (isToday) return `at ${timeStr}`;
                const day = eta.getDate();
                const month = eta.toLocaleString('default', { month: 'long' });
                return `on ${day} ${month} at ${timeStr}`;
              }
              return (
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: '12px 0 0' }}>
                  You are <strong style={{ color: 'var(--fg)' }}>{myRank}</strong> on the clickerboard<br />
                  <strong style={{ color: 'var(--fg)' }}>{gap.toLocaleString()}</strong> clicks away from surpassing <strong style={{ color: 'var(--fg)' }}>{above.user}</strong>
                  {secsLeft !== null && (
                    <> (ETA ~{fmtDuration(secsLeft)},{' '}
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => setUse24h((v) => !v)}
                      >{fmtEta(Date.now() + secsLeft * 1000)}</span>)
                    </>
                  )}
                  {!isActive && <> (no ETA)</>}
                </p>
              );
            })()}
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Clickerboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                This is updated every 10 seconds or every 10 clicks you make
              </span>
              {(() => {
                const now = Date.now();
                const recentClicks = recentClickTimes.current.filter((t) => t > now - 2000);
                const clicking = autoClicking || recentClicks.length > 0;
                if (clicking) {
                  return <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>(paused while clicking)</span>;
                }
                if (nextRefreshAt.current > 0) {
                  const secsLeft = Math.max(0, Math.ceil((nextRefreshAt.current - now) / 1000));
                  return <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>(refreshing in {secsLeft}s)</span>;
                }
                return null;
              })()}
            </div>
          </div>

          {leaderboard && leaderboard.globalClicks && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 4px' }}>
              Global clicks:{' '}
              <strong style={{ color: 'var(--fg)' }}>
                <AnimatedNumber value={parseInt(leaderboard.globalClicks.replace(/,/g, ''), 10)} />
              </strong>
            </p>
          )}
          {leaderboard && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 12px' }}>
              Active clickers:{' '}
              {activeUsers.size === 0
                ? <Skeleton height={13} style={{ width: 24, display: 'inline-block', verticalAlign: 'middle' }} />
                : <strong style={{ color: 'var(--fg)' }}>{activeUsers.size}</strong>
              }
            </p>
          )}

          {!dotHintDismissed && (
            <p
              style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: '0 0 10px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setShowDotModal(true)}
            >
              A <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', opacity: 0.3, verticalAlign: 'middle', marginRight: 4 }} />
              means the user is probably actively clicking. Click to learn more or remove...
            </p>
          )}

          <Modal open={showDotModal} onClose={() => setShowDotModal(false)} title="Active indicator">
            <p className="mt-0 mb-0">A faint red dot appears between a user's rank and name when they are likely currently clicking.</p>
            <p>Activity is tracked across the last 5 snapshots. A new snapshot is taken automatically every 10 seconds or every 10 clicks you make. If someone's click count is higher in the most recent snapshot, they get the dot.</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>The dot fades away automatically if their count stops increasing.<br></br>Like almost every gizmo in this page, it's all just an estimation.</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="primary" onClick={() => {
                hideSet('clickers');
                setDotHintDismissed(true);
                setShowDotModal(false);
              }}>Hide the dot</button>
              <button onClick={() => setShowDotModal(false)}>OK</button>
            </div>
          </Modal>

          {leaderboard && leaderboard.entries.length > 0 ? (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>User</th>
                    <th style={{ textAlign: 'right' }}>Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.entries.map((entry, i) => {
                    const isMe = active?.username === entry.user;
                    return (
                      <tr key={entry.user}>
                        <td style={{
                          position: 'relative',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--muted)',
                          width: 56,
                          ...(isMe && { background: 'color-mix(in srgb, var(--brand-dark) 70%, transparent)' }),
                        }}>
                          {entry.rank}
                          {!dotHintDismissed && activeUsers.has(entry.user) && (
                            <span title="This user seems to be actively clicking" style={{ position: 'absolute', right: -4, top: '50%', transform: 'translateY(-50%)', width: 6, height: 6, borderRadius: '50%', background: '#ef4444', opacity: 0.3, zIndex: 1 }} />
                          )}
                        </td>
                        <td style={{ fontWeight: isMe ? 700 : undefined, ...(isMe && { background: 'color-mix(in srgb, var(--brand-dark) 70%, transparent)' }) }}>
                          {entry.user}
                          {isMe && (
                            <span style={{ marginLeft: 8, fontSize: '0.72rem', background: 'var(--brand)', color: 'var(--brand-text)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '1px 5px', borderRadius: 4 }}>
                              you
                            </span>
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', ...(isMe && { background: 'color-mix(in srgb, var(--brand-dark) 70%, transparent)' }) }}>
                          <AnimatedNumber value={parseInt(entry.clicks.replace(/,/g, ''), 10)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: 'var(--muted)' }}>No</p>
          )}
        </div>
      )}

      <UnlockModal
        open={unlockModalOpen}
        onClose={() => setUnlockModalOpen(false)}
        onUnlock={() => {
          setMathUnlocked(true);
          pendingAutoResume.current = false;
          setAutoClicking(true);
          setAutoClickStatus('active');
          toast.success('Autoclicker unlocked and started. To stop, double click BALANCE again or interrupt it');
        }}
        onSubscribe={startSubscribe}
        subscribing={subscribing}
      />

      <ConfirmModal
        open={pendingNav !== null}
        onClose={() => setPendingNav(null)}
        onConfirm={confirmLeave}
        title="Leave the button?"
        message={subQ.data?.subscribed
          ? 'The autoclicker is currently active! It does not run in the background.'
          : (
            <p className="mt-0">
              The autoclicker is currently active! Your access will be forfeited, and you'll have to do all the math equations again.{' '}
              <span
                style={{ cursor: 'pointer', textDecoration: 'underline' }}
                onClick={(e) => { e.stopPropagation(); setAutoClicking(false); setAutoClickStatus('none'); startSubscribe(); }}
              >
                Or subscribe
              </span>.
            </p>
          )}
        confirmLabel="Leave"
        cancelLabel="Stay"
        danger={!subQ.data?.subscribed}
      />

      <Modal
        open={showWelcomeModal}
        onClose={() => { hideSet('iotm_welcome'); setShowWelcomeModal(false); }}
        title="Welcome to the MyPWAIndia button"
      >
        <p className="mt-0">The MyPWAIndia button is a more polished and interactive version of the original. As in, more numbers and things flying around. <strong>Keep in mind:</strong></p>
        <ul>
          <li>This is based on the same logic and players as the original</li>
          <li>All calculations, like time to surpass, active clickers, and distance are completely estimated - the server may differ</li>
          <li>An autoclicker is available to subscribers, or by solving 5 math equations</li>
        </ul>
        <p className="mb-0">Happy clicking!</p>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="primary" onClick={() => { hideSet('iotm_welcome'); setShowWelcomeModal(false); }}>
            Okay
          </button>
        </div>
      </Modal>
    </>
  );
}
