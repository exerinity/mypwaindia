import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import type { LogoutConfirmationSubtask } from '../api/flow.ts';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import { LogoutIcon } from '../components/ui/icons.tsx';
import { Modal } from '../components/ui/modal.tsx';

interface LogoutModalProps {
  subtask: LogoutConfirmationSubtask | null;
  loading: boolean;
  error: unknown;
}

export default function LogoutPage({ subtask, loading, error }: LogoutModalProps) {
  const { logout, active } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const detail = subtask?.logout_confirmation;
  const cancelAction = detail?.actions.find((action) => action.link_id === 'cancel');
  const logoutAction = detail?.actions.find((action) => action.link_id === 'logout');

  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  if (!active) {
    return <Navigate to="/dash" replace />;
  }

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
    <Modal open className="noanim" onClose={handleClose}>
      {loading && !detail ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skeleton width={220} height={24} />
          <Skeleton width="100%" height={48} />
          <div className="modal-actions">
            <Skeleton width={80} height={38} radius={6} />
            <Skeleton width={100} height={38} radius={6} />
          </div>
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : detail && (
        <>
          <h2 className="mt-0">{detail.primary_text.text}</h2>
          <p className={detail.next_account_text ? undefined : 'mt-0 mb-0'}>
            {detail.secondary_text.text}
            {detail.next_account_text && <> <strong>{detail.next_account_text.text}</strong>.</>}
          </p>
          <div className="modal-actions">
            {cancelAction && (
              <button className="secondary" onClick={handleClose} disabled={isSubmitting}>
                {cancelAction.label}
              </button>
            )}
            {logoutAction && (
              <button
                className="danger"
                onClick={handleLogout}
                disabled={isSubmitting}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <LogoutIcon />
                {isSubmitting ? (logoutAction.pending_label ?? 'Logging out...') : logoutAction.label}
              </button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
