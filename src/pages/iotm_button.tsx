import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { API_BASE } from '../api/config.js';
import { ArrowLeftIcon, ExternalIcon } from '../components/icons.tsx';
import { ErrorBox, Skeleton } from '../components/status.tsx';

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

function AnimatedNumber({ value }: { value: number }) {
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

  return <>{displayed.toLocaleString()}</>;
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

export default function IotmButtonPage() {
  usePageTitle('Button');
  const { active, updateBalance } = useAuth();
  const toast = useToast();

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
  const [use24h, setUse24h] = useState(false);

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
    const id = setInterval(() => {
      fetch(`${API_BASE}/accountservices/iotm/button/?minimal`, {
        headers: { Authorization: `Bearer ${active.token}` },
        credentials: 'include',
      })
        .then((r) => r.ok ? r.text() : Promise.reject())
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const leaderboard = doc.querySelector('#click_leaderboard')?.innerHTML ?? '';
          setState((s) => s ? { ...s, leaderboard } : s);
        })
        .catch(() => {});
    }, 10000);
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
        if (res.success && res.data) {
          const { clicks, payout_in, balance, leaderboard } = res.data;
          setState((s) => ({ ...s!, balance, clicks, payout_in, leaderboard: leaderboard ?? s?.leaderboard ?? '' }));
          localClicks.current = clicks;
          localPayoutIn.current = payout_in;
          setDisplayClicks(clicks);
          setDisplayPayoutIn(payout_in);
          const rupees = parseFloat(balance.replace(/,/g, ''));
          if (!isNaN(rupees) && active) updateBalance(active.id, Math.round(rupees * 100));
        } else {
          toast.error('Server error: ' + (res.message ?? 'Unknown error'));
        }
      })
      .catch((e: unknown) => console.error('Button click error:', e));
  }, [active, updateBalance]);

  function recordClick() {
    const t = Date.now();
    recentClickTimes.current = [...recentClickTimes.current, t].filter((x) => x > t - 5000);
  }

  function handleButtonClick() {
    const now = Date.now();
    if (now - lastClickTime.current <= MIN_CLICK_DELAY_MS) return;
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
        setAutoClicking((v) => !v);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!autoClicking || !active?.token) return;
    const id = setInterval(autoClick, 100);
    return () => clearInterval(id);
  }, [autoClicking, active?.token, autoClick]);

  useEffect(() => {
    const id = setInterval(() => forceUpdate((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

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
            <p style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--muted)', margin: '0 0 4px' }}>
              Balance
            </p>
            <p style={{ fontSize: '2.1rem', fontWeight: 700, margin: '0 0 20px', lineHeight: 1.2 }}>
              {state?.balance ?? '–'}&nbsp;
              <span style={{ fontSize: '1rem', fontWeight: 400, color: 'var(--muted)' }}>INR</span>
            </p>

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
                    <> (~{fmtDuration(secsLeft)},{' '}
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
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Clickerboard</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              This is updated every 10 seconds or every 10 clicks you make
            </span>
          </div>

          {leaderboard && leaderboard.globalClicks && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 12px' }}>
              Global clicks:{' '}
              <strong style={{ color: 'var(--fg)' }}>
                <AnimatedNumber value={parseInt(leaderboard.globalClicks.replace(/,/g, ''), 10)} />
              </strong>
            </p>
          )}

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
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--muted)',
                          width: 56,
                          ...(isMe && { background: 'color-mix(in srgb, var(--brand-dark) 70%, transparent)' }),
                        }}>
                          {entry.rank}
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
    </>
  );
}
