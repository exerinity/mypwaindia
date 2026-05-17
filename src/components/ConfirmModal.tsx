import { Modal } from './Modal.jsx';
import { HoldButton } from './HoldButton.jsx';

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  fullscreen = false,
  holdConfirm = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} fullscreen={fullscreen}>
      <div>
        {typeof message === 'string' ? <p className="mt-0">{message}</p> : message}
        <div className="modal-actions">
          <button className="secondary" onClick={onClose}>{cancelLabel}</button>
          {holdConfirm ? (
            <HoldButton className={danger ? 'danger' : ''} onConfirm={onConfirm}>
              {confirmLabel}
            </HoldButton>
          ) : (
            <button className={danger ? 'danger' : ''} onClick={onConfirm}>{confirmLabel}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}