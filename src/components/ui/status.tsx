import { utility_classes } from '../../styles/utils.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import type { ReactNode, CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ErrorIcon } from './icons.tsx';
import { animation_classes } from '../../styles/animations.stylex.ts';

export function LoadingRow({ children = 'Retrieving data...' }: { children?: ReactNode }) {
  return (
    <div className={`loading-row ${utility_classes.loading_row}`}>
      <span className={`spinner lg ${utility_classes.spinner_large}`} />
      <span className={utility_classes.loading_label}>{children}</span>
    </div>
  );
}

export function Empty({ children = 'Nothing here.' }: { children?: ReactNode }) {
  return <div className={`empty ${utility_classes.empty}`}>{children}</div>;
}

export function Skeleton({ width, height = 14, radius = 4, style }: {
  width?: string | number;
  height?: string | number;
  radius?: number;
  style?: CSSProperties;
}) {
  return <span className={`skeleton ${animation_classes.skeleton}`} style={{ width, height, borderRadius: radius, ...style }} />;
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null;
  const e = error as { message?: string; name?: string; code?: unknown; status?: unknown };
  const parts: string[] = [];
  if (e.name && e.name !== 'Error') parts.push(e.name);
  if (e.code != null) parts.push(`code ${e.code}`);
  if (e.status != null && e.status !== 0) parts.push(`HTTP ${e.status}`);
  return (
    <div className={`alert alert-error ${alert_classes.error}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <ErrorIcon />
      <span>
        {e.message === 'Unauthorized.'
          ? <>Your session is no longer valid. <Link to="/i/sessions" className="link">Would you like to restart it?</Link></>
          : (e.message || String(error))}
        {parts.length > 0 && <span className={`muted ${utility_classes.muted}`} style={{ marginLeft: 8, fontSize: '0.85em' }}>({parts.join(' - ')})</span>}
      </span>
    </div>
  );
}
