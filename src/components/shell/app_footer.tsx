import type { CSSProperties } from 'react';
import { utility_classes } from '../../styles/utils.stylex.ts';
import { Link } from 'react-router-dom';

export function AppFooter({ version, style, className }: { version: string; style?: CSSProperties; className?: string }) {
  return (
    <p className={`muted ${utility_classes.muted}${className ? ` ${className}` : ''}`} style={{ fontSize: '0.8rem', marginTop: 24, ...style }}>
      <Link to="/i/release_notes">v{version.toLocaleLowerCase()}</Link>
      {' | '}
      by <a href="https://exerinity.com" target="_blank" rel="noopener noreferrer">exerinity</a>
      {' | '}
      <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer">MyPayIndia.com</a>
      {' | '}
      <Link to="/i/acknowledgements">acknowledgements</Link>
    </p>
  );
}
