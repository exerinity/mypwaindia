import { useAuth } from '../context/auth_ctx.tsx';
import { useCurrency } from '../context/settings_ctx.tsx';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { Skeleton } from './status.tsx';

export function BalancePill() {
  const { active } = useAuth();
  const { userInfo, userInfoLoading } = useGlobalData();
  const format = useCurrency();
  if (!active) return null;
  const bal = userInfo?.balance ?? (typeof active.lastBalance === 'number' ? active.lastBalance : null);
  return (
    <div className="pill pill-balance">
      <span className="pill-label">Balance</span>
      <span className="pill-value">
        {bal === null
          ? (userInfoLoading ? <Skeleton width={52} height={14} radius={4} style={{ display: 'inline-block' }} /> : '0')
          : format(bal)}
      </span>
    </div>
  );
}