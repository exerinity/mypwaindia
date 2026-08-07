import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import React, { useState, lazy, Suspense } from 'react';
import { usePageTitle } from '../../hooks/page_title.js';
import { RELEASES } from './release_notes_notes.tsx';
import type { Release } from './release_notes_notes.tsx';
import { ExternalIcon } from '../../components/ui/icons.tsx';
const AppFooter = lazy(() => import('../../components/shell/app_footer.tsx').then((m) => ({ default: m.AppFooter })));

export { RELEASES };

function ReleaseItem({ r, borderBottom, open, onToggle }: { r: Release; borderBottom: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: borderBottom ? '1px solid var(--border)' : 'none', padding: '4px 0' }}>
      <button
        className="release-summary"
        onClick={onToggle}
        aria-expanded={open}
      >
        <strong>Version {r.version}</strong>
        <span className="muted" style={{ fontSize: '0.85rem' }}>{r.date}</span>
      </button>
      <div className={`release-body${open ? ' open' : ''}`}>
        <div className="release-body-inner">
          {r.disclaimer && (
            <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 4px' }}>{r.disclaimer}</p>
          )}
          {(() => {
            const out: React.ReactNode[] = [];
            let buf: React.ReactNode[] = [];
            const flush = (k: string) => { if (buf.length) { out.push(<ul key={k} style={{ marginTop: 6, marginBottom: 4 }}>{buf}</ul>); buf = []; } };
            r.notes.forEach((note, j) => {
              if (typeof note === 'object' && !React.isValidElement(note)) {
                flush(`ul${j}`);
                if ('h2' in note) out.push(<h2 key={j}>{note.h2}</h2>);
                else if ('h3' in note) out.push(<h3 key={j}>{note.h3}</h3>);
                else if ('p' in note) out.push(<p key={j}>{note.p}</p>);
              } else {
                buf.push(<li key={j}>{note as React.ReactNode}</li>);
              }
            });
            flush('end');
            return out;
          })()}
          {r.subnotes && (
            <small>
              <ul style={{ marginBottom: 10 }}>
                {r.subnotes.map((n, j) => <li key={j}>{n}</li>)}
              </ul>
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

type ReleaseBlock = { h2: string | React.ReactElement } | { h3: string | React.ReactElement } | { p: React.ReactNode };
type ReleaseEntry = Release | ReleaseBlock;

const RELEASE_LIST: ReleaseEntry[] = [
  ...RELEASES,
];

export default function ReleaseNotesPage() {
  usePageTitle('Release notes');
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());
  const allExpanded = expandedVersions.size === RELEASES.length;

  function toggleVersion(version: string) {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(version)) next.delete(version); else next.add(version);
      return next;
    });
  }

  function toggleAll() {
    setExpandedVersions(allExpanded ? new Set() : new Set(RELEASES.map(r => r.version)));
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <h1 className="mt-0">Release notes</h1>
      <p className="mt-0 mb-0">See what's happening on the MyPayIndia PWA. View new changes and fixes for mypayindia.sbs, app.mypayindia.com, and MyPayIndia Lite for Android. We're constantly working to make the MyPayIndia PWA a world-class experience. We hope you enjoy reading about our work!
      </p>

      <p className="mt-0 mb-0"><a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer">
        Please submit feedback in the Discord, mentioning @exerinity in the #dev channel <ExternalIcon />
      </a></p>
      <div className="card">
        <div className="row spread" style={{ marginBottom: 12 }}>
          <p className="mt-0 mb-0">There are {RELEASES.length} releases to show:</p>
          <button className="compact secondary" onClick={toggleAll}>
            {allExpanded ? 'Close all' : 'Open all'}
          </button>
        </div>
        {RELEASE_LIST.map((entry, i) => {
          if ('h2' in entry) return <h2 key={i}>{entry.h2}</h2>;
          if ('h3' in entry) return <h3 key={i}>{entry.h3}</h3>;
          if ('p' in entry) return <p key={i}>{entry.p}</p>;
          return (
            <ReleaseItem
              key={entry.version}
              r={entry}
              borderBottom={i < RELEASE_LIST.length - 1}
              open={expandedVersions.has(entry.version)}
              onToggle={() => toggleVersion(entry.version)}
            />
          );
        })}
      </div>
      <AppFooter version={RELEASES[0].version} />
    </Suspense>
  );
}
