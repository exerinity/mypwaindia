import { Link } from 'react-router-dom';
import { Logo } from './logo.tsx';
import { HamburgerIcon } from './icons.tsx';
import { AccountPill } from './acc_pill.tsx';
import { BalancePill } from './bal_pill.tsx';

export function Header({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  return (
    <header className="app-header">
      <div className="app-header-row">
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Open navigation menu"
        >
          <HamburgerIcon />
        </button>
        <Link to="/dash" aria-label="Go to dashboard"><Logo /></Link>
        <div className="app-header-spacer" />
      </div>
      <div className="pill-row" role="status" aria-live="polite">
        <AccountPill />
        <BalancePill />
      </div>
    </header>
  );
}
