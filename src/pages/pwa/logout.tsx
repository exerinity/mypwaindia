import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { LogoutIcon } from '../../components/ui/icons.tsx';
import { Modal } from '../../components/ui/modal.tsx';

export default function LogoutPage() {
  const { logout, active, accounts } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;
  const otherAccounts = active ? accounts.filter((account) => account.id !== active.id) : [];
  const nextAccount = otherAccounts[otherAccounts.length - 1] ?? null;

  if (!active) return <Navigate to="/dash" replace />;

  function handleClose() {
    if (bgLoc) navigate(-1);
    else navigate('/dash');
  }

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await logout();
      toast.info('Logged out.');
      window.location.replace('/');
    } catch (error) {
      toast.error((error as { message?: string })?.message || 'Something went wrong - but don\'t fret, it\'s not your fault. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open className="noanim" onClose={handleClose}>
      <h2 className="mt-0">Log out of @{active.username}?</h2>
      <p className={nextAccount ? undefined : 'mt-0 mb-0'}>
        {nextAccount
          ? "This will only apply to this account, and you'll still be logged in to your other accounts. You'll be switched to "
          : <>You can always log back in at any time. If you just want to switch accounts, you can do that <Link to="/i/flow/login">by adding an existing account</Link>.</>}
        {nextAccount && <strong>@{nextAccount.username}.</strong>}
      </p>
      <div className="modal-actions">
        <button className="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</button>
        <button
          onClick={handleLogout}
          disabled={isSubmitting}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
        >
          <LogoutIcon />
          {isSubmitting ? 'Logging out...' : 'Log out'}
        </button>
      </div>
    </Modal>
  );
}
