import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { LogoutIcon } from '../components/icons.tsx';
import { Modal } from '../components/modal.tsx';
import { usePageTitle } from '../hooks/page_title.js';

export default function LogoutPage() {
  usePageTitle('Log out');
  const { logout, active, accounts } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const remaining = accounts.filter((a) => a.id !== active?.id);
  const nextAccount = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const nextName = nextAccount ? nextAccount.username : null;

  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

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
      toast.error((error as {message?:string})?.message || 'Could not log out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open onClose={handleClose} title="Log out of MyPWAIndia" className="slide">
      <p className="mt-0">
        Are you sure you want to log out of <strong>{active?.username || 'this account'}</strong> on this device?
      </p>
      {nextName && (
        <small className="muted">
          You have other accounts saved - you'll be switched to <strong>{nextName}</strong>
        </small>
      )}
      <div className="modal-actions">
        <button className="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </button>
        <button
          className="danger"
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
