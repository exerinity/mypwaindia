import { useLocation } from 'react-router-dom';
import { getDriveUser, type DriveUser } from '../../api/drive.ts';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useCurrency } from '../../context/settings_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.ts';
import { formatBytes } from '../../pages/drive/drive_helpers.ts';

export function BalancePill() {
  const { active } = useAuth();
  const { userInfo, userInfoLoading } = useGlobalData();
  const location = useLocation();
  const format = useCurrency();
  const backgroundPath = (location.state as { backgroundLocation?: { pathname?: string } } | null)?.backgroundLocation?.pathname;
  const currentPath = backgroundPath ?? location.pathname;
  const inDrive = currentPath === '/i/drive' || currentPath === '/i/drive/trash' || currentPath === '/i/drive/new';
  const driveUser = useCachedQuery<DriveUser>(
    active && inDrive ? `drive-user:${active.id}` : null,
    () => getDriveUser(active!.token),
    [active?.token, currentPath],
    { skip: !active || !inDrive }
  );
  if (!active) return null;

  if (inDrive) {
    return (
      <div className="pill pill-balance">
        <span className="pill-label">Storage</span>
        <span className="pill-value">
          {driveUser.data
            ? `${formatBytes(driveUser.data.space_used)} / ${formatBytes(driveUser.data.space_available)}`
            : driveUser.loading
              ? <span className="spinner" style={{ verticalAlign: 'middle' }} />
              : 'Unavailable'}
        </span>
      </div>
    );
  }

  const bal = userInfo?.balance ?? (typeof active.lastBalance === 'number' ? active.lastBalance : null);
  return (
    <div className="pill pill-balance">
      <span className="pill-label">Balance</span>
      <span className="pill-value">
        {bal === null
          ? (userInfoLoading ? <span className="spinner" style={{ verticalAlign: 'middle' }} /> : '0')
          : format(bal)}
      </span>
    </div>
  );
}
