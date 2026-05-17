import type { ReactNode } from 'react';

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

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="alert alert-error">
      {(error as { message?: string }).message || String(error)}
    </div>
  );
}
