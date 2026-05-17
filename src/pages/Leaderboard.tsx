import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useSettings } from '../context/SettingsContext.tsx';
import { getLeaderboard } from '../api/info.js';
import { formatINR } from '../utils/money.js';
import { LoadingRow, ErrorBox, Empty } from '../components/Status.tsx';

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
        {loading && !data ? <LoadingRow /> :
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