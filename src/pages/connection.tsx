import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../hooks/page_title.js';

type CheckState = 'loading' | 'success' | 'fail';

function StatusBadge({ state, label }: { state: CheckState; label: string }) {
  if (state === 'loading') {
    return <span className="skeleton" style={{ display: 'inline-block', width: 120, height: '1em', verticalAlign: 'middle', borderRadius: 4 }} />;
  }
  const colors: Record<Exclude<CheckState, 'loading'>, string> = {
    success: 'var(--alert-success)',
    fail: 'var(--alert-error)',
  };
  const text: Record<Exclude<CheckState, 'loading'>, string> = {
    success: 'responded',
    fail: 'did not respond',
  };
  return (
    <span style={{ color: colors[state], fontWeight: 600 }}>
      {label}: {text[state]}
    </span>
  );
}

export default function ConnectionPage() {
  usePageTitle('Connection check');
  const [bastionState, setBastionState] = useState<CheckState>('loading');
  const [mpiState, setMpiState] = useState<CheckState>('loading');

  useEffect(() => {
    fetch('https://bastion.mypayindia.sbs/int')
      .then(res => res.text())
      .then(text => setBastionState(text.toLowerCase().includes('not found') ? 'success' : 'fail'))
      .catch(() => setBastionState('fail'));

    fetch('https://mypayindia.com', { mode: 'no-cors' })
      .then(res => setMpiState(res.type === 'opaque' ? 'success' : 'fail'))
      .catch(() => setMpiState('fail'));
  }, []);

  const done = (s: CheckState) => s === 'success' || s === 'fail';
  const allDone = done(bastionState) && done(mpiState);

  const onLine = navigator.onLine;
  const bastion = bastionState === 'success';
  const mpi = mpiState === 'success';

  let conclusion: React.ReactNode = 'Waiting for the results...';
  if (allDone) {
    if (onLine && bastion && mpi) {
      conclusion = <>You are connected to the internet. The app may have a stale cache - press <kbd>Ctrl+Shift+R</kbd> to update it</>;
    } else if (onLine && !bastion && mpi) {
      conclusion = <>The gateway is unresponsive. Please notify <a href="https://exerinity.com/hello">exerinity</a>.</>;
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
        <h3 className="mt-0">Browser</h3>
        <p style={{ margin: 0 }}>
          <strong>Online (via navigator.onLine):</strong>{' '}
          <span style={{ color: onLine ? 'var(--alert-success)' : 'var(--alert-error)', fontWeight: 600 }}>
            {String(onLine)}
          </span>
        </p>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Gateway</h3>
        <StatusBadge state={bastionState} label="Gateway" />
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">mypayindia.com</h3>
        <StatusBadge state={mpiState} label="mypayindia.com" />
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Conclusion</h3>
        <p style={{ margin: 0 }}>{conclusion}</p>
      </div>
    </>
  );
}
