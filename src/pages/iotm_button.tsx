import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
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

function parseLeaderboardHtml(html: string): { globalClicks: string; entries: LeaderEntry[] } {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const p = doc.querySelector('p');
  const globalClicks = p?.textContent?.replace('Global clicks:', '').trim() ?? '';
  const rows = doc.querySelectorAll('tbody tr');
  const entries: LeaderEntry[] = [];
  rows.forEach((row) => {
    const rank = row.querySelector('.rank-col')?.textContent?.trim() ?? '';
    const user = row.querySelector('.user-col')?.textContent?.trim() ?? '';
    const clicks = row.querySelector('.balance-col')?.textContent?.trim() ?? '';
    if (rank && user && clicks) entries.push({ rank, user, clicks });
  });
  return { globalClicks, entries };
}

export default function IotmButtonPage() {
  usePageTitle('Button');
  const { active } = useAuth();

  const [state, setState] = useState<ButtonState | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const [displayClicks, setDisplayClicks] = useState(0);
  const [displayPayoutIn, setDisplayPayoutIn] = useState(0);

  const localClicks = useRef(0);
  const localPayoutIn = useRef(0);
  const lastClickTime = useRef(0);
  const tempClicks = useRef(0);

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
        } else {
          window.alert('Server error: ' + (res.message ?? 'Unknown error'));
        }
      })
      .catch((e: unknown) => console.error('Button click error:', e));
  }, [active?.token]);

  function handleButtonClick() {
    const now = Date.now();
    if (now - lastClickTime.current <= MIN_CLICK_DELAY_MS) return;
    lastClickTime.current = now;

    tempClicks.current++;
    localClicks.current++;
    localPayoutIn.current = localPayoutIn.current > 1 ? localPayoutIn.current - 1 : PAYOUT_EVERY;

    setDisplayClicks(localClicks.current);
    setDisplayPayoutIn(localPayoutIn.current);

    if (tempClicks.current >= CLICK_BATCH_SIZE) {
      sendBatch();
    }
  }

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
          </>
        )}
      </div>

      {!loading && !error && (
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 14 }}>Clickerboard</h3>

          {leaderboard && leaderboard.globalClicks && (
            <p style={{ fontSize: '0.875rem', color: 'var(--muted)', margin: '0 0 12px' }}>
              Global clicks:{' '}
              <strong style={{ color: 'var(--fg)' }}>
                {parseInt(leaderboard.globalClicks.replace(/,/g, ''), 10).toLocaleString()}
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
                      <tr key={i} style={isMe ? { background: 'color-mix(in srgb, var(--brand) 10%, transparent)' } : undefined}>
                        <td style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 700,
                          color: i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--muted)',
                          width: 56,
                        }}>
                          {entry.rank}
                        </td>
                        <td style={{ fontWeight: isMe ? 700 : undefined }}>
                          {entry.user}
                          {isMe && (
                            <span style={{ marginLeft: 8, fontSize: '0.72rem', color: 'var(--brand)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                              you
                            </span>
                          )}
                        </td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                          {parseInt(entry.clicks, 10).toLocaleString()}
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
