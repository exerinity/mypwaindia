import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrency } from '../../context/settings_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { ChevronRight } from '../ui/icons.tsx';
import type { Transaction } from './tx_table.tsx';

interface DayGroup { key: string; iso: string; items: Transaction[] }

function groupByDay(transactions: Transaction[]): DayGroup[] {
  const groups: DayGroup[] = [];
  const byKey = new Map<string, DayGroup>();

  const ordered = [...transactions].sort(
    (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
  );

  for (const tx of ordered) {
    const date = new Date(tx.created);
    if (isNaN(date.getTime())) continue;
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, iso: tx.created, items: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.items.push(tx);
  }

  return groups;
}

interface SimpleHistoryListProps {
  transactions: Transaction[];
  currentUserId?: number;
  embedded?: boolean;
}

export function SimpleHistoryList({ transactions, currentUserId, embedded = false }: SimpleHistoryListProps) {
  const format = useCurrency();
  const location = useLocation();
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const groups = useMemo(() => groupByDay(transactions), [transactions]);

  if (!groups.length) return <div className="empty">Nothing yet</div>;

  return (
    <div className={`simple-tx-list${embedded ? ' simple-tx-list--embedded' : ''}`}>
      {groups.map((group) => (
        <div key={group.key}>
          <div className="simple-tx-day">
            {datesMod ? datesMod.formatDayHeading(group.iso) : '...'}
          </div>
          {group.items.map((tx) => {
            const outgoing = currentUserId != null && tx.sender?.id === currentUserId;
            const other = (outgoing ? tx.recipient?.username : tx.sender?.username) || 'someone';
            return (
              <Link
                key={tx.id}
                to={`/i/flow/transaction/${tx.transaction_id}`}
                state={{ backgroundLocation: location }}
                className="simple-tx-row"
              >
                <span className="simple-tx-main">
                  <span className="simple-tx-name">{other}</span>
                  <span className={`simple-tx-amount ${outgoing ? 'out' : 'in'}`}>
                    {outgoing ? '-' : '+'}{format(tx.amount)}
                  </span>
                </span>
                <span className="simple-tx-meta">
                  <span className="simple-tx-time">
                    {datesMod ? datesMod.formatTimeShort(tx.created) : '...'}
                  </span>
                  <span className={`simple-tx-status ${tx.status}`}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </span>
                <span className="simple-tx-chevron"><ChevronRight size={16} /></span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
