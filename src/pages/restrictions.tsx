import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { useRefreshTimer } from '../hooks/refresh_timer.js';
import { usePageTitle } from '../hooks/page_title.js';
import { formatDate } from '../utils/dates.js';
import { getRestrictionInfo } from '../utils/restrictions.js';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { RefreshStatus } from '../components/refresh_status.tsx';
import { WarningIcon, ArrowLeftIcon, SuccessIcon } from '../components/icons.tsx';

export default function RestrictionsPage() {
  usePageTitle('Account restrictions');
  const { active } = useAuth();
  const { settings } = useSettings();

  const { restrictions: data, restrictionsLoading: loading, restrictionsError: error, refetchRestrictions } = useGlobalData();
  const { secondsLeft, refreshNow } = useRefreshTimer([refetchRestrictions], { enabled: settings.autoRefresh && !!active });

  const restrictionList = data
    ? Object.entries(data.restrictions).filter(([, v]) => v?.active)
    : [];

  return (
    <>
      <h1 className="mt-0">{data && restrictionList.length === 0 ? 'No restrictions' : 'Restrictions'}</h1>
      <p className="mt-0 mb-0" style={{ marginBottom: 20 }}>
        <Link to="/account" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeftIcon /> Back
        </Link>
      </p>
      {loading && !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <Skeleton width={22} height={22} radius={50} />
                <Skeleton width={190} height={20} />
              </div>
              <Skeleton height={13} style={{ marginBottom: 6, width: '92%' }} />
              <Skeleton height={13} style={{ marginBottom: 6, width: '78%' }} />
              <Skeleton height={13} style={{ marginBottom: 6, width: '60%' }} />
              <Skeleton height={13} style={{ marginTop: 14, width: 180 }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : restrictionList.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="mt-0 mb-0 alert alert-success"><SuccessIcon /><span>You don't have any active restrictions on your account.</span></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {restrictionList.map(([key, val]) => {
            const info = getRestrictionInfo(key);
            return (
              <div key={key} className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--alert-error)' }}>
                  <WarningIcon size={22} />
                  <h2 style={{ margin: 0, fontSize: '1.15rem' }}>{info.title}</h2>
                </div>

                <p className="mt-0 mb-0" style={{ margin: '0 0 20px', lineHeight: 1.65 }}>
                  {info.longDescription ?? info.description}
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: '0.85rem', fontWeight: 500,
                  color: val.expires_at ? 'var(--muted)' : 'var(--alert-error)',
                }}>
                  {val.expires_at
                    ? `Expires ${formatDate(val.expires_at)}`
                    : 'Has no expiration date'}
                </div>

                {val.value != null && (
                  <pre style={{
                    margin: '12px 0 0', fontSize: '0.78rem',
                    color: 'var(--muted)', background: 'var(--bg-elev)',
                    padding: '8px 12px', borderRadius: 6, overflow: 'auto',
                  }}>
                    {JSON.stringify(val.value, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />
    </>
  );
}
