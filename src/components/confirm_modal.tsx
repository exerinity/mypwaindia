import type { ReactNode } from 'react';
import { lazy, Suspense } from 'react';

const Modal = lazy(() => import('./modal.tsx').then((m) => ({ default: m.Modal })));
const HoldButton = lazy(() => import('./hold_btn.tsx').then((m) => ({ default: m.HoldButton })));

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
    <Suspense fallback={null}>
      <Modal open={open} onClose={onClose} title={title} fullscreen={fullscreen}>
        <div>
          {typeof message === 'string' ? <p className="mt-0">{message}</p> : message}
          <div className="modal-actions">
            <button className="secondary" onClick={onClose}>{cancelLabel}</button>
            {holdConfirm ? (
              <Suspense fallback={<button className={danger ? 'danger' : ''} disabled>{confirmLabel}</button>}>
                <HoldButton className={danger ? 'danger' : ''} onConfirm={onConfirm}>
                  {confirmLabel}
                </HoldButton>
              </Suspense>
            ) : (
              <button className={danger ? 'danger' : ''} onClick={onConfirm}>{confirmLabel}</button>
            )}
          </div>
        </div>
      </Modal>
    </Suspense>
  );
}
