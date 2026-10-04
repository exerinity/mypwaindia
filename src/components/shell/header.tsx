import { shell_classes } from '../../styles/shell.stylex.ts';
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { HamburgerIcon } from '../ui/icons.tsx';

const Logo = lazy(() => import('../ui/logo.tsx').then((m) => ({ default: m.Logo })));
const AccountPill = lazy(() => import('../account/acc_pill.tsx').then((m) => ({ default: m.AccountPill })));
const BalancePill = lazy(() => import('../account/bal_pill.tsx').then((m) => ({ default: m.BalancePill })));
const InstallPill = lazy(() => import('./install_pill.tsx').then((m) => ({ default: m.InstallPill })));

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className={`mpi-header ${shell_classes.mpi_header}`}>
      <div className={`mpi-header-row ${shell_classes.mpi_header_row}`}>
        <button
          className={`hamburger-btn ${shell_classes.hamburger_btn}`}
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>
        <Link to="/dash" aria-label="Go to dashboard"><Suspense fallback={null}><Logo className={`mpi-header-logo ${shell_classes.mpi_header_logo}`} /></Suspense></Link>
        <div className={`mpi-header-spacer ${shell_classes.mpi_header_spacer}`} />
      </div>
      <div className={`mpi-pills ${shell_classes.mpi_pills}`} role="status" aria-live="polite">
        <Suspense fallback={null}>
          <AccountPill />
          <BalancePill />
          <InstallPill />
        </Suspense>
      </div>
    </header>
  );
}
