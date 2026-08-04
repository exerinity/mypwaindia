import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { HamburgerIcon } from './icons.tsx';

const Logo = lazy(() => import('./logo.tsx').then((m) => ({ default: m.Logo })));
const AccountPill = lazy(() => import('./acc_pill.tsx').then((m) => ({ default: m.AccountPill })));
const BalancePill = lazy(() => import('./bal_pill.tsx').then((m) => ({ default: m.BalancePill })));
const InstallPill = lazy(() => import('./install_pill.tsx').then((m) => ({ default: m.InstallPill })));

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="mpi-header">
      <div className="mpi-header-row">
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>
        <Link to="/dash" aria-label="Go to dashboard"><Suspense fallback={null}><Logo /></Suspense></Link>
        <div className="mpi-header-spacer" />
      </div>
      <div className="mpi-pills" role="status" aria-live="polite">
        <Suspense fallback={null}>
          <AccountPill />
          <BalancePill />
          <InstallPill />
        </Suspense>
      </div>
    </header>
  );
}
