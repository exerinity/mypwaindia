import React, { useState, useMemo, useRef, lazy } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import type { Account, LoginSessionResponse } from '../../context/auth_ctx.tsx';
import { login as apiLogin, logout as apiLogout } from '../../api/auth.js';
import { useToast } from '../../context/toast_ctx.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { InfoIcon, ErrorIcon, LockIcon, ArrowLeftIcon } from '../../components/ui/icons.tsx';
import { usePageTitle } from '../../hooks/page_title.js';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { getUserInfo, listSessions, invalidateSession } from '../../api/user.js';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';

const ConfirmModal = lazy(() => import('../../components/ui/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
const FloatingInput = lazy(() => import('../../components/ui/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));
const RefreshStatus = lazy(() => import('../../components/ui/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));

interface Session { id: string; device_info?: string; ip?: string; created_at: string; last_active: string; current?: boolean; invalidated?: boolean }

const BACK_TARGETS: Record<string, { to: string; label: string }> = {
  settings: { to: '/settings', label: 'settings' },
  account: { to: '/account', label: 'account info' },
};

type SessionSortCol = 'device' | 'created' | 'last_active' | 'status';
const SESSION_COL_SORTS: Record<SessionSortCol, [string, string]> = {
  device: ['device_az', 'device_za'],
  created: ['created_desc', 'created_asc'],
  last_active: ['last_active_desc', 'last_active_asc'],
  status: ['status_active', 'status_invalidated'],
};

function SessionRow({ s, onTerminate, formatDate }: { s: Session; onTerminate: (s: Session) => void; formatDate: (d: string) => string }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <tr key={s.id}>
      <td>{s.device_info || '-'}{s.current && <strong> (current)</strong>}</td>
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
          {s.invalidated ? 'terminated' : 'active'}
        </span>
      </td>
      <td>
        {!s.invalidated && !s.current && (
          <button className="compact danger" onClick={() => onTerminate(s)}>
            Terminate
          </button>
        )}
      </td>
    </tr>
  );
}

export default function SessionsPage() {
  usePageTitle('Sessions');

  const { settings } = useSettings();
  const { active, updateAccountInfo } = useAuth();
  const location = useLocation();
  const backTarget = BACK_TARGETS[(location.state as { from?: string } | null)?.from ?? ''];
  const toast = useToast();
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const formatDate = (d: string) => datesMod ? datesMod.formatDate(d) : '...';

  const [reinitStage, setReinitStage] = useState<'identify' | 'logout' | 'login' | 'verify' | 'cleanup' | null>(null);
  const reinitRef = useRef<{ account: Account; oldSessionId: string | null } | null>(null);
  const reinitBusyRef = useRef(false);
  const [reinit2faOpen, setReinit2faOpen] = useState(false);
  const [reinit2faCode, setReinit2faCode] = useState('');
  const [reinit2faError, setReinit2faError] = useState<string | null>(null);

  const [sessionSort, setSessionSort] = useState('last_active_desc');
  const [killTarget, setKillTarget] = useState<Session | null>(null);
  const [terminateAllOpen, setTerminateAllOpen] = useState(false);
  const [terminatingProgress, setTerminatingProgress] = useState<{ current: number; total: number } | null>(null);
  const terminateStopRef = useRef(false);

  const sessionsQ = useCachedQuery<{ sessions: Session[] }>(
    active ? `sessions:${active.id}` : null,
    () => listSessions(active!) as Promise<{ sessions: Session[] }>,
    [active?.token],
    { skip: !active }
  );

  const { secondsLeft: sessionsSecondsLeft, refreshNow: refreshSessionsNow } = useRefreshTimer(
    [sessionsQ.refetch],
    { enabled: settings.autoRefresh && !!active }
  );

  const sortedSessions = useMemo(() => {
    const arr = [...(sessionsQ.data?.sessions || [])];
    arr.sort((a, b) => {
      switch (sessionSort) {
        case 'device_az': return (a.device_info || '').localeCompare(b.device_info || '');
        case 'device_za': return (b.device_info || '').localeCompare(a.device_info || '');
        case 'created_asc': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created_desc': return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'last_active_asc': return new Date(a.last_active).getTime() - new Date(b.last_active).getTime();
        case 'last_active_desc': return new Date(b.last_active).getTime() - new Date(a.last_active).getTime();
        case 'status_active': return (a.invalidated ? 1 : 0) - (b.invalidated ? 1 : 0);
        case 'status_invalidated': return (b.invalidated ? 1 : 0) - (a.invalidated ? 1 : 0);
        default: return 0;
      }
    });
    return arr;
  }, [sessionsQ.data, sessionSort]);

  function toggleSessionCol(col: SessionSortCol) {
    const [first, second] = SESSION_COL_SORTS[col];
    setSessionSort(prev => prev === first ? second : first);
  }
  function sessionColIndicator(col: SessionSortCol) {
    const [first, second] = SESSION_COL_SORTS[col];
    if (sessionSort === first) return ' ↓';
    if (sessionSort === second) return ' ↑';
    return ' ↕';
  }

  async function performReinitLogin(totpCode?: string) {
    const pending = reinitRef.current;
    if (!pending || reinitBusyRef.current) return;
    const { account, oldSessionId } = pending;
    reinitBusyRef.current = true;
    setReinitStage('login');
    let waitingFor2fa = false;
    let verified = false;
    try {
      let data: LoginSessionResponse;
      try {
        data = await apiLogin({ username: account.username, password: account.password!, totp_code: totpCode || undefined, env: account.env }) as LoginSessionResponse;
      } catch (e) {
        const err = e as { code?: number };
        if (err.code !== 1002 && err.code !== 1010) throw e;
        waitingFor2fa = true;
        setReinit2faError(err.code === 1010 ? 'Incorrect 2FA code, try again.' : null);
        setReinit2faOpen(true);
        return;
      }
      setReinit2faOpen(false);
      setReinit2faCode('');
      setReinit2faError(null);
      if (!data.session_id || data.session_id === account.token) {
        throw new Error('The server did not create a new session, the old session was not terminated');
      }

      setReinitStage('verify');
      const newAccount = { ...account, token: data.session_id };
      const info = await getUserInfo(newAccount) as { username: string; role: string };
      if (info.username !== account.username || data.user.id !== account.id) {
        throw new Error('The new login could not be verified for this account, the old session was not terminated');
      }
      updateAccountInfo(account.id, { token: data.session_id, role: info.role, username: info.username });
      verified = true;

      if (oldSessionId !== null) {
        setReinitStage('cleanup');
        await invalidateSession(newAccount, oldSessionId);
      }
      toast.success('Session reinitialized');
    } catch (e) {
      const { describeError } = await import('../../utils/errors.js');
      toast.error(verified ? `Logged back in, but could not terminate the old session (perhaps it is already null): ${describeError(e)}` : describeError(e));
      setReinit2faOpen(false);
    } finally {
      if (!waitingFor2fa) reinitRef.current = null;
      reinitBusyRef.current = false;
      setReinitStage(null);
      if (verified) void sessionsQ.refetch();
    }
  }

  async function doReinitializeSession() {
    if (!active?.password || reinitBusyRef.current || reinitRef.current) return;
    const account = { ...active };
    setReinit2faCode('');
    setReinit2faError(null);
    if (Number((sessionsQ.error as { code?: unknown } | null)?.code) === 1001) {
      reinitRef.current = { account, oldSessionId: null };
      await performReinitLogin();
      return;
    }
    reinitBusyRef.current = true;
    setReinitStage('identify');
    try {
      const { sessions } = await listSessions(account) as { sessions: Session[] };
      const currentSession = sessions.find((s) => s.current);
      if (!currentSession?.id) throw new Error('Could not identify the current session, no sessions were changed');
      reinitRef.current = { account, oldSessionId: currentSession.id };
      setReinitStage('logout');
      await apiLogout();
    } catch (e) {
      if (Number((e as { code?: unknown } | null)?.code) === 1001) {
        reinitRef.current = { account, oldSessionId: null };
      } else {
        reinitRef.current = null;
        const { describeError } = await import('../../utils/errors.js');
        toast.error(describeError(e));
        setReinitStage(null);
        return;
      }
    } finally {
      reinitBusyRef.current = false;
    }
    await performReinitLogin();
  }

  function cancelReinit2fa() {
    if (reinitBusyRef.current) return;
    reinitRef.current = null;
    setReinit2faOpen(false);
    setReinit2faCode('');
    setReinit2faError(null);
  }

  async function doServerLogout() {
    const currentSession = sessionsQ.data?.sessions.find((s) => s.current);
    if (currentSession) {
      try { await invalidateSession(active!, currentSession.id); } catch (_) { }
    }
    try { await apiLogout(); } catch (_) { }
    toast.success('OK, have fun!');
    sessionsQ.refetch();
  }

  async function submitReinit2fa() {
    await performReinitLogin(reinit2faCode);
  }

  async function doKillSession(id: string) {
    try {
      await invalidateSession(active!, id);
      toast.success('Session terminated');
      sessionsQ.refetch();
    } catch (e) {
      const { describeError } = await import('../../utils/errors.js');
      toast.error(describeError(e));
    }
  }

  async function doTerminateAll() {
    const targets = (sessionsQ.data?.sessions ?? []).filter((s) => !s.invalidated && !s.current);
    setTerminateAllOpen(false);
    terminateStopRef.current = false;
    setTerminatingProgress({ current: 0, total: targets.length });
    let terminated = 0;
    for (let i = 0; i < targets.length; i++) {
      if (terminateStopRef.current) break;
      setTerminatingProgress({ current: i + 1, total: targets.length });
      try {
        await invalidateSession(active!, targets[i].id);
        terminated++;
      } catch (e) {
        const { describeError } = await import('../../utils/errors.js');
        toast.error(describeError(e));
      }
      if (i < targets.length - 1 && !terminateStopRef.current) {
        await new Promise<void>((r) => setTimeout(r, 500));
      }
    }
    setTerminatingProgress(null);
    toast.success(`Terminated ${terminated} session${terminated === 1 ? '' : 's'}`);
    sessionsQ.refetch();
  }

  return (
    <>
      <h1 className="mt-0">List of sessions</h1>
      {backTarget && (
        <p className="mt-0 mb-0" style={{ marginBottom: 20 }}>
          <Link to={backTarget.to} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <ArrowLeftIcon /> Back to {backTarget.label}
          </Link>
        </p>
      )}

      <div className="alert alert-info mt-0" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <InfoIcon />
        <span>Sessions are managed in both the client and server: your browser saves your account and session token; the server dictates whether that session is valid.</span>
      </div>

      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
          <InfoIcon />
          <span>To view sessions, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
        </div>
      )}
      {active && (
        <>
          <h3 className="mt-0">Reinitialize session</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
            {(sessionsQ.error as { code?: unknown })?.code === 1001
              ? 'Your session has expired. Pressing Reinitialize session will tell the server to log you back in using the app saved credentials'
              : 'If something feels stuck or out of sync, you can tell the server to log you out and back in using your saved credentials'}
          </p>
          <div className="row spread" style={{ alignItems: 'center', marginBottom: 20 }}>
            <button
              className="compact"
              disabled={!active.password || reinitStage !== null || reinit2faOpen}
              onClick={doReinitializeSession}
            >
              {reinitStage === 'identify' && <><span className="spinner" /> Retrieving data...</>}
              {reinitStage === 'logout' && <><span className="spinner" /> Logging out...</>}
              {reinitStage === 'login' && <><span className="spinner" /> Logging in...</>}
              {reinitStage === 'verify' && <><span className="spinner" /> Retrieving data...</>}
              {reinitStage === 'cleanup' && <><span className="spinner" /> Terminating old session...</>}
              {reinitStage === null && (reinit2faOpen ? 'Waiting for 2FA code...' : 'Reinitialize session')}
            </button>
            {!active.password && (
              <span className="muted" style={{ fontSize: '0.85rem' }}>No saved password for this account, so this can't be done</span>
            )}
          </div>
          <hr style={{ margin: '0 0 20px', borderColor: 'var(--border)' }} />
          <h3 className="mt-0">Server logout</h3>
          <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>This will tell the server to log out, but it leaves the app alone. For debugging purposes only - this will cause problems</p>
          <div>
            <button className="compact danger" onClick={doServerLogout}>Log out server side</button>
          </div>
          <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
        </>
      )}

      {active && (sessionsQ.loading && !sessionsQ.data ? (
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
      ) : sessionsQ.error ? <ErrorBox error={sessionsQ.error} /> : (
        <>
          <div className="row gap-sm" style={{ marginBottom: 14, flexWrap: 'wrap' }}>
            {(() => {
              const total = sortedSessions.length;
              const active = sortedSessions.filter((s) => !s.invalidated).length;
              const terminated = sortedSessions.filter((s) => s.invalidated).length;
              return (
                <>
                  <span className="link-status active">{active} active</span>
                  <span className="link-status cancelled">{terminated} terminated</span>
                  <span className="muted" style={{ fontSize: '0.875rem', alignSelf: 'center' }}>{total} total</span>
                </>
              );
            })()}
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th onClick={() => toggleSessionCol('device')} style={{ cursor: 'pointer' }}>Device{sessionColIndicator('device')}</th>
                  <th>IP</th>
                  <th onClick={() => toggleSessionCol('created')} style={{ cursor: 'pointer' }}>Created{sessionColIndicator('created')}</th>
                  <th onClick={() => toggleSessionCol('last_active')} style={{ cursor: 'pointer' }}>Last active{sessionColIndicator('last_active')}</th>
                  <th onClick={() => toggleSessionCol('status')} style={{ cursor: 'pointer' }}>Status{sessionColIndicator('status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedSessions.map((s) => (
                  <SessionRow key={s.id} s={s} onTerminate={setKillTarget} formatDate={formatDate} />
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 16 }}>
            <button
              className="danger"
              onClick={() => setTerminateAllOpen(true)}
              disabled={sortedSessions.filter((s) => !s.invalidated && !s.current).length < 3}
            >
              Terminate all sessions
            </button>
          </div>
          <RefreshStatus seconds={sessionsSecondsLeft} onRefresh={refreshSessionsNow} enabled={settings.autoRefresh} />
        </>
      ))}

      <ConfirmModal
        open={!!killTarget}
        onClose={() => setKillTarget(null)}
        onConfirm={() => {
          if (killTarget) doKillSession(killTarget.id);
          setKillTarget(null);
        }}
        title="Terminate session"
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
                <div style={{ fontSize: '0.9rem' }}>{killTarget.device_info || '-'}</div>
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
        confirmLabel="Continue"
      />

      <ConfirmModal
        open={terminateAllOpen}
        onClose={() => setTerminateAllOpen(false)}
        onConfirm={doTerminateAll}
        title={`Terminate all ${sortedSessions.filter((s) => !s.invalidated && !s.current).length} sessions`}
        message={`Really terminate ${sortedSessions.filter((s) => !s.invalidated && !s.current).length} sessions? The current session will remain logged in.`}
        confirmLabel="Terminate all sessions"
      />

      <Modal
        className="slide"
        bgIcon={<div className="app-lock-bg-icon"><LockIcon size={666} /></div>}
        open={!!terminatingProgress}
        onClose={() => { terminateStopRef.current = true; }}
        title="Terminating sessions..."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 0, marginBottom: 16 }}>
          <span className="spinner" />
          <span>Terminating {terminatingProgress?.current} of {terminatingProgress?.total} session{terminatingProgress?.total === 1 ? '' : 's'}, please wait...</span>
        </div>
        <div className="btn-row">
          <button className="danger" onClick={() => { terminateStopRef.current = true; }}>
            Stop
          </button>
        </div>
      </Modal>

      <Modal
        fullscreen
        className="slide"
        bgIcon={<div className="app-lock-bg-icon"><LockIcon size={666} /></div>}
        open={reinit2faOpen}
        onClose={cancelReinit2fa}
        title="You need a 2FA code"
      >
        <form onSubmit={(e) => { e.preventDefault(); submitReinit2fa(); }}>
          <p className="mt-0" style={{ color: 'var(--muted)' }}>
            Enter the two-factor code for <strong>{reinitRef.current?.account.username}</strong> to finish...
          </p>
          <FloatingInput
            label="Two-factor code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            value={reinit2faCode}
            onChange={(e) => setReinit2faCode(e.target.value)}
            autoFocus
            disabled={reinitStage === 'login'}
          />
          {reinit2faError && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ErrorIcon /><span>{reinit2faError}</span>
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary"
              onClick={cancelReinit2fa}
              disabled={reinitStage === 'login'}
            >
              Cancel
            </button>
            <button type="submit" disabled={reinitStage === 'login' || !reinit2faCode}>
              {reinitStage === 'login' ? <><span className="spinner" /> Logging in...</> : 'Continue'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
