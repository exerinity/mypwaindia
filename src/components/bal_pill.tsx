import { useAuth } from '../context/auth_ctx.tsx';
import { useCurrency } from '../context/settings_ctx.tsx';

export function BalancePill() {
  const { active } = useAuth();
  const format = useCurrency();
  if (!active) return null;
  const bal = typeof active.lastBalance === 'number' ? active.lastBalance : null;
  return (
    <div className="pill pill-balance">
      <span className="pill-label">Balance</span>
      <span className="pill-value">
        {bal === null ? '0' : format(bal)}
      </span>
    </div>
  );
}