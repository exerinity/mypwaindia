import { Link } from 'react-router-dom';
import { Logo } from './Logo.jsx';
import { HamburgerIcon } from './Icons.jsx';
import { AccountPill } from './AccountPill.jsx';
import { BalancePill } from './BalancePill.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function Header({ onToggleSidebar }) {
  const { active } = useAuth();
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
      {active && (
        <div className="pill-row" role="status" aria-live="polite">
          <AccountPill />
          <BalancePill />
        </div>
      )}
    </header>
  );
}