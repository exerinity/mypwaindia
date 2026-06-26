import { useState, useEffect, useRef, useCallback } from 'react';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getLeaderboard } from '../api/flow.ts';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';

const REFRESH_INTERVAL = 10;

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

export default function LeaderboardPage() {
  usePageTitle('Leaderboard');
  interface LeaderEntry { username: string; balance: number }
  const { data, loading, error, refetch } = useApiCall<{ leaderboard: LeaderEntry[] }>(
    () => getLeaderboard() as Promise<{ leaderboard: LeaderEntry[] }>,
    [],
    { refresh: false }
  );

  const [paused, setPaused] = useState(false);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const countdownRef = useRef(REFRESH_INTERVAL);
  const moneyMod = useLazyModule(() => import('../utils/money.js'));
  const formatINR = (n: number) => moneyMod ? moneyMod.formatINR(n) : '...';

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      countdownRef.current -= 1;
      if (countdownRef.current <= 0) {
        countdownRef.current = REFRESH_INTERVAL;
        setCountdown(REFRESH_INTERVAL);
        refetch();
      } else {
        setCountdown(countdownRef.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, refetch]);

  const handleRefreshNow = useCallback(() => {
    countdownRef.current = REFRESH_INTERVAL;
    setCountdown(REFRESH_INTERVAL);
    refetch();
  }, [refetch]);

  const board = data?.leaderboard || [];

  return (
    <>
      <h1 className="mt-0">Leaderboard</h1>
      <div className="card compact">
        {loading && !data ? Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="lb-row">
            <Skeleton width={28} height={14} />
            <div style={{ flex: 1, padding: '0 12px' }}><Skeleton height={14} style={{ width: `${45 + (i % 4) * 12}%` }} /></div>
            <Skeleton width={72} height={14} />
          </div>
        )) :
         error ? <ErrorBox error={error} /> :
         board.length === 0 ? <Empty>The leaderboard is empty - this is not intended. Err... refresh??</Empty> :
         board.map((u, i) => {
           const rank = i + 1;
           return (
             <div key={u.username} className="lb-row">
               <span className={`lb-rank top-${rank}`}>#{rank}</span>
               <span className="lb-username">@{u.username}</span>
               <span className="lb-balance">
                 <AnimatedNumber value={u.balance} format={formatINR} />
               </span>
             </div>
           );
         })
        }
      </div>

      <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 10, marginBottom: 0 }}>
        {`refreshing in ${countdown}s`}
        {' '}
        <button
          onClick={() => setPaused((p) => !p)}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: 'inherit' }}
        >
          ({paused ? 'resume' : 'pause'})
        </button>
        {' '}
        <button
          onClick={handleRefreshNow}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--muted)', textDecoration: 'underline', cursor: 'pointer', font: 'inherit', fontSize: 'inherit' }}
        >
          (refresh now)
        </button>
      </p>
    </>
  );
}
