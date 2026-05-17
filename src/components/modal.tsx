import { useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons.tsx';


interface ModalProps { open: boolean; onClose?: () => void; title: string; fullscreen?: boolean; children: ReactNode }
export function Modal({ open, onClose, title, fullscreen = false, children }: ModalProps) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open) return null;

  const node = (
    <div
      className={`modal-root ${fullscreen ? 'fullscreen' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {!fullscreen && (
        <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      )}
      <div className="modal-panel">
        <header className="modal-header">
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <CloseIcon />
          </button>
          <h2 className="modal-title">{title}</h2>
          <div className="modal-header-spacer" />
        </header>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}