import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { LogoutIcon } from '../components/icons.tsx';
import { usePageTitle } from '../hooks/page_title.js';

export default function LogoutPage() {
  usePageTitle('Log out');
  const { logout, active } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogout() {
    setIsSubmitting(true);
    try {
      await logout();
      toast.info('Logged out.');
      window.location.replace('/i/flow/login');
    } catch (error) {
      toast.error((error as {message?:string})?.message || 'Could not log out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 400, width: '100%' }}>
        <h2 className="mt-0">Log out</h2>
        <p className="muted">
          Log out of <strong>{active?.username || 'this account'}</strong> on this device?
        </p>
        <div className="btn-row">
          <button
            className="danger"
            onClick={handleLogout}
            disabled={isSubmitting}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <LogoutIcon />
            {isSubmitting ? 'Logging out...' : 'Log out'}
          </button>
          <button className="secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}