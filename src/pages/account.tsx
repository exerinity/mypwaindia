import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings, useCurrency } from '../context/settings_ctx.tsx';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { useToast } from '../context/toast_ctx.tsx';
import { getUserInfo, getRestrictions, listSessions, invalidateSession, verifyEmail } from '../api/user.js';
import { formatDate, calcAge } from '../utils/dates.js';
import { describeError } from '../utils/errors.js';
import { Skeleton, ErrorBox } from '../components/status.tsx';
import { WarningIcon } from '../components/icons.tsx';
import { getRestrictionInfo } from '../utils/restrictions.js';
import { ConfirmModal } from '../components/confirm_modal.tsx';
import { Modal } from '../components/modal.tsx';

export default function AccountPage() {
  usePageTitle('Account');
  const { active, updateAccountInfo } = useAuth();
  const { settings } = useSettings();
  const formatBalance = useCurrency();
  const toast = useToast();
  const [sendingVerify, setSendingVerify] = useState(false);
  interface Age { years: number; months: number; weeks: number; days: number }
  interface Session { id: string; device_info?: string; ip?: string; created_at: string; last_active: string; current?: boolean; invalidated?: boolean }
  type UserInfo = { balance: number; first_name: string; last_name: string; email: string; date_of_birth?: string; created: string; mfa_enabled: boolean; username: string; role: string };
  type Restrictions = { restrictions: Record<string, { active: boolean; expires_at?: string; value?: unknown }> };

  const [killTarget, setKillTarget] = useState<Session | null>(null);
  const [personalDetailsOpen, setPersonalDetailsOpen] = useState(false);
  const [securityCode, setSecurityCode] = useState(['', '', '', '', '']);

  const userQ = useApiCall<UserInfo>(async () => {
    const info = await getUserInfo(active!) as UserInfo;
    updateAccountInfo(active!.id, { lastBalance: info.balance, firstName: info.first_name, lastName: info.last_name });
    return info;
  }, [active?.token], { refresh: settings.autoRefresh });

  const restrictionsQ = useApiCall<Restrictions>(
    () => getRestrictions(active!) as Promise<Restrictions>,
    [active?.token],
    { refresh: settings.autoRefresh }
  );

  const sessionsQ = useApiCall<{ sessions: Session[] }>(
    () => listSessions(active!) as Promise<{ sessions: Session[] }>,
    [active?.token]
  );

  async function handleVerify() {
    setSendingVerify(true);
    try {
      await verifyEmail(active!);
      toast.success('Verification email dispatched!');
    } catch (e) {
      toast.error(describeError(e));
    } finally {
      setSendingVerify(false);
    }
  }

  async function doKillSession(id: string) {
    try {
      await invalidateSession(active!, id);
      toast.success('Session terminated');
      sessionsQ.refetch();
    } catch (e) {
      toast.error(describeError(e));
    }
  }

  function AgeTag({ age }: { age: Age }) {
    const [hovered, setHovered] = useState(false);
    return (
      <span
        style={{ position: 'relative', display: 'inline-block' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span style={{ color: 'var(--muted)', fontSize: '0.85em', cursor: 'help' }}>
          ({age.years > 0 ? `${age.years}y` : age.months > 0 ? `${age.months}mo` : age.weeks > 0 ? `${age.weeks}w` : `${age.days}d`})
        </span>
        {hovered && (
          <span style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface-2, #222)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}>
            {age.years} years, {age.months} months, {age.weeks} weeks, {age.days} days
          </span>
        )}
      </span>
    );
  }

  function SessionRow({ s }: { s: Session }) {
    const [revealed, setRevealed] = useState(false);
    return (
      <tr key={s.id}>
        <td>{s.device_info || '—'}{s.current && <strong> (current)</strong>}</td>
        <td
          className="mono"
          onMouseEnter={() => setRevealed(true)}
          onMouseLeave={() => setRevealed(false)}
          style={{
            filter: revealed ? 'none' : 'blur(6px)',
            transition: 'filter 0.25s',
            cursor: 'default',
            userSelect: 'none',
          }}
        >
          {s.ip}
        </td>
        <td>{formatDate(s.created_at)}</td>
        <td>{formatDate(s.last_active)}</td>
        <td>
          <span className={`link-status ${s.invalidated ? 'cancelled' : 'active'}`}>
            {s.invalidated ? 'invalidated' : 'active'}
          </span>
        </td>
        <td>
          {!s.invalidated && !s.current && (
            <button className="compact danger" onClick={() => setKillTarget(s)}>
              End
            </button>
          )}
        </td>
      </tr>
    );
  }

  const u = userQ.data;
  const restrictionList = Object.entries(restrictionsQ.data?.restrictions || {})
    .filter(([, v]) => v?.active);

  return (
    <>
      <h1 className="mt-0">Account</h1>

      {userQ.loading && !u ? (
        <>
          <div className="card mb-2">
            <div className="row spread">
              <div>
                <Skeleton width={180} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={130} height={14} />
              </div>
              <div style={{ textAlign: 'right' }}>
                <Skeleton width={52} height={12} style={{ marginBottom: 8 }} />
                <Skeleton width={110} height={28} />
              </div>
            </div>
            <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
            <div className="grid cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton width={50} height={11} style={{ marginBottom: 6 }} />
                  <Skeleton width={`${90 + (i % 3) * 28}px`} height={15} />
                </div>
              ))}
            </div>
          </div>
          <div className="card mb-2"><Skeleton width={160} height={32} radius={6} /></div>
          <div className="card">
            <Skeleton width={120} height={18} style={{ marginBottom: 16 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : undefined }}>
                <Skeleton width={`${30 + (i % 3) * 10}%`} height={13} />
                <Skeleton width={80} height={13} />
                <Skeleton width={70} height={13} />
                <Skeleton width={70} height={13} />
                <Skeleton width={50} height={13} />
              </div>
            ))}
          </div>
        </>
      ) :
        userQ.error ? <ErrorBox error={userQ.error} /> :
          u && (
            <>
              <div className="card mb-2">
                <div className="row spread">
                  <div>
                    <h3 style={{ margin: 0 }}>{u.first_name} {u.last_name}</h3>
                    <p className="muted">@{u.username} - {u.role}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="stat-label">Balance</div>
                    <div className="balance-display">{formatBalance(u.balance)}</div>
                  </div>
                </div>
                <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '16px 0' }} />
                <div className="grid cols-2">
                  <div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>Email</div>
                    <div>{u.email}</div>
                  </div>
                  <div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>Date of birth</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {u.date_of_birth || '—'}
                      {u.date_of_birth && (() => {
                        const a = calcAge(u.date_of_birth);
                        if (!a) return null;
                        return <AgeTag age={a} />;
                      })()}
                    </div>
                  </div>
                  {!settings.scambait && (
                    <div>
                      <div className="muted" style={{ fontSize: '0.8rem' }}>Member since</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {formatDate(u.created)}
                        {u.created && (() => {
                          const a = calcAge(u.created);
                          if (!a) return null;
                          return <AgeTag age={a} />;
                        })()}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="muted" style={{ fontSize: '0.8rem' }}>2FA</div>
                    <div>{u.mfa_enabled ? 'yes' : 'no'}</div>
                  </div>
                </div>
              </div>

              {restrictionList.length > 0 && (
                <div className="card mb-2">
                  <div className="row spread" style={{ marginBottom: 12 }}>
                    <h3 className="mt-0" style={{ margin: 0 }}>Restrictions</h3>
                    <Link to="/account/restrictions" className="muted" style={{ fontSize: '0.85rem' }}>View details</Link>
                  </div>
                  {restrictionList.map(([key, val]) => {
                    const info = getRestrictionInfo(key);
                    return (
                      <div key={key} className="alert alert-warning">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><WarningIcon /><strong>{info.title}</strong></div>
                        <p style={{ margin: '4px 0 0' }}>{info.description}</p>
                        {val.expires_at && (
                          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                            Expires {formatDate(val.expires_at)}
                          </p>
                        )}
                        {val.value != null && (
                          <p className="muted mono" style={{ margin: '4px 0 0', fontSize: '0.8rem' }}>
                            {JSON.stringify(val.value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="card mb-2">
                <h3 className="mt-0">Verification</h3>
                <button onClick={handleVerify} disabled={sendingVerify}>
                  {sendingVerify ? 'Sending...' : 'Send verification email'}
                </button>
              </div>

              <div className="card">
                <h3 className="mt-0">Active sessions</h3>
                {sessionsQ.loading && !sessionsQ.data ? (
                  <>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid var(--border)' : undefined }}>
                        <Skeleton width={`${25 + (i % 3) * 8}%`} height={13} />
                        <Skeleton width={90} height={13} />
                        <Skeleton width={80} height={13} />
                        <Skeleton width={80} height={13} />
                        <Skeleton width={55} height={13} />
                      </div>
                    ))}
                  </>
                ) :
                  sessionsQ.error ? <ErrorBox error={sessionsQ.error} /> : (
                    <div className="table-wrap">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Device</th>
                            <th>IP</th>
                            <th>Created</th>
                            <th>Last active</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {(sessionsQ.data?.sessions || []).map((s) => (
                            <SessionRow key={s.id} s={s} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>

              <div className="btn-row mt-2">
                <Link to="/account/transfer" className="btn">Transfer funds</Link>
                <Link to="/account/history" className="btn secondary">Transaction history</Link>
                {settings.scambait && (
                  <button className="btn secondary" onClick={() => setPersonalDetailsOpen(true)}>
                    View personal details
                  </button>
                )}
              </div>
              <Modal open={personalDetailsOpen} onClose={() => { setPersonalDetailsOpen(false); setSecurityCode(['', '', '', '', '']); }} title="Personal details">
                <p style={{ marginTop: 0 }}>
                  For security purposes, your personal details cannot be displayed directly.
                </p>
                <p>
                  Your bank will call you shortly on your registered number to verify your identity.
                  Once connected, the agent will provide you with a <strong>5-digit security code</strong> - please have it ready to enter here.
                </p>
                <p className="muted" style={{ fontSize: '0.85rem' }}>
                  Do not share this code with anyone other than your bank representative.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {securityCode.map((digit, i) => (
                      <input
                        key={i}
                        id={`scode-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(-1);
                          const next = [...securityCode];
                          next[i] = val;
                          setSecurityCode(next);
                          if (val && i < 4) document.getElementById(`scode-${i + 1}`)?.focus();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && i > 0) document.getElementById(`scode-${i - 1}`)?.focus();
                        }}
                        onFocus={(e) => e.target.select()}
                        style={{
                          width: 52,
                          height: 64,
                          textAlign: 'center',
                          fontSize: '1.8rem',
                          fontFamily: 'monospace',
                          border: '2px solid var(--border)',
                          borderRadius: 8,
                          background: 'var(--surface-2, var(--bg))',
                          color: 'var(--text)',
                          outline: 'none',
                        }}
                      />
                    ))}
                  </div>
                  <button
                    disabled={securityCode.some((d) => !d)}
                    onClick={() => {
                      const code = securityCode.join('');
                      if (['06767', '67676', '12345'].includes(code)) {
                        window.open('https://www.youtube.com/watch?v=dQw4w9WgXcQ', '_blank');
                      } else {
                        toast.error('Invalid security code. Please try again.');
                      }
                      setSecurityCode(['', '', '', '', '']);
                      document.getElementById('scode-0')?.focus();
                    }}
                  >
                    Submit
                  </button>
                </div>
              </Modal>

              <ConfirmModal
                open={!!killTarget}
                onClose={() => setKillTarget(null)}
                onConfirm={() => {
                  if (killTarget) doKillSession(killTarget.id);
                  setKillTarget(null);
                }}
                title="End session"
                message={killTarget && (
                  <div>
                    <p className="mt-0" style={{ color: 'var(--muted)' }}>
                      This will immediately sign out and invalidate the following session:
                    </p>
                    <div style={{
                      background: 'var(--surface-2, var(--bg))',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '16px 20px',
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '16px',
                      marginBottom: 20,
                    }}>
                      <div>
                        <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Device</div>
                        <div style={{ fontSize: '0.9rem' }}>{killTarget.device_info || '—'}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>IP address</div>
                        <div className="mono" style={{ fontSize: '0.9rem' }}>{killTarget.ip}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Created</div>
                        <div style={{ fontSize: '0.9rem' }}>{formatDate(killTarget.created_at)}</div>
                      </div>
                      <div>
                        <div className="muted" style={{ fontSize: '0.75rem', marginBottom: 5 }}>Last active</div>
                        <div style={{ fontSize: '0.9rem' }}>{formatDate(killTarget.last_active)}</div>
                      </div>
                    </div>
                  </div>
                )}
                confirmLabel="End session"
              />
            </>
          )}
    </>
  );
}