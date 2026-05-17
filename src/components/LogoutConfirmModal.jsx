import { Modal } from './Modal.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export function LogoutConfirmModal({ open, onClose, onConfirm }) {
  const { active } = useAuth();
  const username = active?.username || 'this account';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log out"
      fullscreen
    >
      <div className="center">
        <h2 className="mt-0">Are you sure you want to log out of <span style={{ color: 'var(--brand)' }}>{username}</span>?</h2>
        <p className="muted">
          If you have other accounts logged in, they'll remain.
        </p>
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>Stay signed in</button>
          <button className="danger" onClick={onConfirm}>Log out</button>
        </div>
      </div>
    </Modal>
  );
}