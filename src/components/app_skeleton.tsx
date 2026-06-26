export function ContentSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
      <span className="skeleton" style={{ height: 28, width: '38%', borderRadius: 6 }} />
      <span className="skeleton" style={{ height: 16, width: '65%' }} />
      <span className="skeleton" style={{ height: 16, width: '50%' }} />
      <span className="skeleton" style={{ height: 16, width: '58%', marginTop: 8 }} />
    </div>
  );
}

export function HeaderSkeleton() {
  return (
    <header className="mpi-header">
      <div className="mpi-header-row">
        <span className="skeleton" style={{ height: 32, width: 32, borderRadius: 8 }} />
        <span className="skeleton" style={{ height: 38, width: 110, borderRadius: 6 }} />
        <div className="mpi-header-spacer" />
      </div>
      <div className="mpi-pills" style={{ display: 'flex', gap: 8 }}>
        <span className="skeleton" style={{ height: 30, width: 130, borderRadius: 999 }} />
        <span className="skeleton" style={{ height: 30, width: 90, borderRadius: 999 }} />
      </div>
    </header>
  );
}

export function SidebarSkeleton() {
  return (
    <aside className="mpi-sidebar open" aria-hidden="true">
      <div className="mpi-sidebarmobile-header">
        <span className="skeleton" style={{ height: 32, width: 88, borderRadius: 6 }} />
      </div>
      {[1, 2, 3].map((g) => (
        <div key={g} style={{ padding: '0 0 14px' }}>
          <span className="skeleton" style={{ height: 11, width: '40%', marginBottom: 10 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
              <span className="skeleton" style={{ height: 16, width: 16, borderRadius: 4 }} />
              <span className="skeleton" style={{ height: 13, width: `${50 + (i * 13) % 30}%` }} />
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

export function AppShellSkeleton() {
  return (
    <div className="mpi-shell">
      <div className="mpi-sticky-top">
        <HeaderSkeleton />
      </div>
      <div className="mpi-body">
        <SidebarSkeleton />
        <main className="mpi-main">
          <div className="mpi-wrap">
            <ContentSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span className="skeleton" style={{ height: 24, width: '55%' }} />
        <span className="skeleton" style={{ height: 42, width: '100%', borderRadius: 8 }} />
        <span className="skeleton" style={{ height: 42, width: '100%', borderRadius: 8 }} />
        <span className="skeleton" style={{ height: 42, width: '100%', borderRadius: 8, marginTop: 8 }} />
      </div>
    </div>
  );
}
