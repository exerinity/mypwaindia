import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getRestrictions } from '../api/user.js';
import { formatDate } from '../utils/dates.js';
import { getRestrictionInfo } from '../utils/restrictions.js';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { WarningIcon, ArrowLeftIcon } from '../components/icons.tsx';

type RestrictionVal = { active: boolean; expires_at?: string; value?: unknown };
type Restrictions = { restrictions: Record<string, RestrictionVal> };

export default function RestrictionsPage() {
  usePageTitle('Account Restrictions');
  const { active } = useAuth();

  const { data, loading, error } = useApiCall<Restrictions>(
    () => getRestrictions(active!) as Promise<Restrictions>,
    [active?.token]
  );

  const restrictionList = data
    ? Object.entries(data.restrictions).filter(([, v]) => v?.active)
    : [];

  return (
    <>
      <h1 className="mt-0">Restrictions</h1>
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
        <p className="mt-0 mb-0">You don't have any active restrictions on your account. If you were expecting to see anything here or somehow landed on this page by mistake, you might want to clear your cache and/or log out and back in.</p>
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
    </>
  );
}
