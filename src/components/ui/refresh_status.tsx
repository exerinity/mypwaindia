import type { CSSProperties } from 'react';

const linkStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  color: 'var(--muted)',
  textDecoration: 'underline',
  cursor: 'pointer',
  font: 'inherit',
  fontSize: 'inherit',
};

export function RefreshStatus({ seconds, onRefresh, enabled = true }: { seconds: number; onRefresh: () => void; enabled?: boolean }) {
  return (
    <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 10, marginBottom: 0 }}>
      {enabled && `refreshing in ${seconds}s `}
      <button onClick={onRefresh} style={linkStyle}>
        (refresh now)
      </button>
    </p>
  );
}
