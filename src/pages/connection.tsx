import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/page_title.js';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api/config.js';

type CheckState = 'loading' | 'success' | 'fail' | 'down';

function StatusBadge({ state, label, reason }: { state: CheckState; label: string; reason?: string | null }) {
  if (state === 'loading') {
    return <span className="skeleton" style={{ display: 'inline-block', width: 120, height: '1em', verticalAlign: 'middle', borderRadius: 4 }} />;
  }
  const colors: Record<Exclude<CheckState, 'loading'>, string> = {
    success: 'var(--alert-success)',
    fail: 'var(--alert-error)',
    down: 'var(--alert-error)',
  };
  const text: Record<Exclude<CheckState, 'loading'>, string> = {
    success: 'responded',
    fail: 'did not respond',
    down: 'down',
  };
  return (
    <span style={{ color: colors[state], fontWeight: 600 }}>
      {text[state]}
      {reason && <span style={{ fontWeight: 400 }}> ({reason})</span>}
    </span>
  );
}

export default function ConnectionPage() {
  usePageTitle('Connection check');
  const [bastionState, setBastionState] = useState<CheckState>('loading');
  const [bastionReason, setBastionReason] = useState<string | null>(null);
  const [mpiState, setMpiState] = useState<CheckState>('loading');
  const [mpiReason, setMpiReason] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/v2/info/leaderboard`, { mode: 'no-cors' })
      .then(res => {
        if (res.type === 'opaque' || res.status > 0) {
          setBastionState('success');
          setBastionReason(null);
        } else {
          setBastionState('fail');
          setBastionReason(`${res.status}`);
        }
      })
      .catch(e => {
        setBastionState('fail');
        setBastionReason(e instanceof Error ? e.message : 'network error');
      });

    fetch('https://mypayindia.com')
      .then(res => {
        if ([502, 503, 504, 523].includes(res.status)) {
          setMpiState('down');
          setMpiReason(`${res.status}`);
        } else if (res.ok) {
          setMpiState('success');
          setMpiReason(null);
        } else {
          setMpiState('fail');
          setMpiReason(`${res.status}`);
        }
      })
      .catch(() => {
        fetch('https://mypayindia.com', { mode: 'no-cors' })
          .then(res => {
            if (res.type === 'opaque') {
              setMpiState('success');
              setMpiReason(null);
            } else {
              setMpiState('fail');
            }
          })
          .catch(e => {
            setMpiState('fail');
            setMpiReason(e instanceof Error ? e.message : 'network error');
          });
      });
  }, []);

  const done = (s: CheckState) => s === 'success' || s === 'fail' || s === 'down';
  const allDone = done(bastionState) && done(mpiState);

  const onLine = navigator.onLine;
  const bastion = bastionState === 'success';
  const mpi = mpiState === 'success';

  let conclusion: React.ReactNode = 'Waiting for the results...';
  if (allDone) {
    if (mpiState === 'down') {
      conclusion = <>MyPayIndia is down.</>;
    } else if (onLine && bastion && mpi) {
      conclusion = <>You are connected to the internet, the bastion responded and so did MyPayIndia. If the app is misbehaving, there may be a stale cache - press <kbd>Ctrl+Shift+R</kbd> to update it. Or your session may have expired - <Link to="/i/flow/sessions" className="link">reinitialize the session</Link>.</>;
    } else if (onLine && !bastion && mpi) {
      conclusion = <>The bastion is unresponsive. Please notify <a href="https://exerinity.com/hello">exerinity</a>.</>;
    } else if (onLine && bastion && !mpi) {
      conclusion = <>MyPayIndia is currently down.</>;
    } else {
      conclusion = <>Everything did not respond, so you are 99% offline. Connect to the internet and try again.</>;
    }
  }

  return (
    <>
      <h1 className="mt-0">Connection check</h1>

      <div className="card mb-2">
        <h3 className="mt-0">You</h3>
        <p style={{ margin: 0 }}>
          <strong>Online (via navigator.onLine):</strong>{' '}
          <span style={{ color: onLine ? 'var(--alert-success)' : 'var(--alert-error)', fontWeight: 600 }}>
            {String(onLine)}
          </span>
        </p>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">PWA backend/proxy</h3>
        <StatusBadge state={bastionState} label="bastion" reason={bastionReason} />
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">mypayindia.com</h3>
        <StatusBadge state={mpiState} label="mypayindia.com" reason={mpiReason} />
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Conclusion</h3>
        <p style={{ margin: 0 }}>{conclusion}</p>
      </div>
    </>
  );
}
