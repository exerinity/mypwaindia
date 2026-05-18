import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useSettings } from '../context/settings_ctx.tsx';
import { getLeaderboard } from '../api/info.js';
import { formatINR } from '../utils/money.js';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';

export default function LeaderboardPage() {
  usePageTitle('Leaderboard');
  const { settings } = useSettings();
  interface LeaderEntry { username: string; balance: number }
  const { data, loading, error } = useApiCall<{ leaderboard: LeaderEntry[] }>(
    () => getLeaderboard() as Promise<{ leaderboard: LeaderEntry[] }>,
    [],
    { refresh: settings.autoRefresh }
  );

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
             <div key={`${u.username}-${rank}`} className="lb-row">
               <span className={`lb-rank top-${rank}`}>#{rank}</span>
               <span className="lb-username">@{u.username}</span>
               <span className="lb-balance">{formatINR(u.balance)}</span>
             </div>
           );
         })
        }
      </div>
    </>
  );
}