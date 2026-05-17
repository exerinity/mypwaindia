import type { ReactNode } from 'react';
import { Modal } from './Modal.tsx';
import { HoldButton } from './HoldButton.tsx';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  fullscreen?: boolean;
  holdConfirm?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, message,
  confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = true, fullscreen = false, holdConfirm = false,
}: ConfirmModalProps) {
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