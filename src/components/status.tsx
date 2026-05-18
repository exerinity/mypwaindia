import type { ReactNode, CSSProperties } from 'react';
import { ErrorIcon } from './icons.tsx';

export function LoadingRow({ children = 'Retrieving data...' }: { children?: ReactNode }) {
  return (
    <div className="loading-row">
      <span className="spinner lg" />
      <span>{children}</span>
    </div>
  );
}

export function Empty({ children = 'Nothing here.' }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Skeleton({ width, height = 14, radius = 4, style }: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: CSSProperties;
}) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ErrorIcon />
      <span>{(error as { message?: string }).message || String(error)}</span>
    </div>
  );
}
