import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

export function AppFooter({ version, style }: { version: string; style?: CSSProperties }) {
  return (
    <p className="muted" style={{ fontSize: '0.8rem', marginTop: 24, ...style }}>
      <Link to="/i/release_notes">v{version.toLocaleLowerCase()}</Link>
      {' | '}
      by <a href="https://exerinity.com" target="_blank" rel="noopener noreferrer">exerinity</a>
      {' | '}
      {window.location.hostname === 'mypayindia.sbs' ? 'production' : 'staging'}
      {' | '}
      <a href="https://legacy.mpi.exerinity.gay" target="_blank" rel="noopener noreferrer">legacy</a>
      {' | '}
      <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer">MyPayIndia.com</a>
      {' | '}
      <Link to="/i/acknowledgements">acknowledgements</Link>
    </p>
  );
}
