import { utility_classes } from '../../styles/utils.stylex.ts';
import { shell_classes } from '../../styles/shell.stylex.ts';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCurrency } from '../../context/settings_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';

export function BalancePill() {
  const { active } = useAuth();
  const { userInfo, userInfoLoading } = useGlobalData();
  const format = useCurrency();
  if (!active) return null;

  const bal = userInfo?.balance ?? (typeof active.lastBalance === 'number' ? active.lastBalance : null);
  return (
    <div className={`pill pill-balance ${shell_classes.pill}`}>
      <span className={`pill-label ${shell_classes.pill_label}`}>Balance</span>
      <span className={`pill-value ${shell_classes.pill_balance_value}`}>
        {bal === null
          ? (userInfoLoading ? <span className={`spinner ${utility_classes.spinner}`} style={{ verticalAlign: 'middle' }} /> : '0')
          : format(bal)}
      </span>
    </div>
  );
}
