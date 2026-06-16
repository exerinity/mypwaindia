import { useEffect, useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons.tsx';
import { Logo } from './logo.tsx';


interface ModalProps { open: boolean; onClose?: () => void; title?: string; fullscreen?: boolean; className?: string; children: ReactNode }
export function Modal({ open, onClose, title, fullscreen = false, className, children }: ModalProps) {
  const [closing, setClosing] = useState(false);

  const handleClose = useCallback(() => {
    setClosing(true);
  }, []);

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') handleClose();
  }, [handleClose]);

  useEffect(() => {
    if (!open) { setClosing(false); return; }
    document.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, handleKey]);

  if (!open && !closing) return null;

  const node = (
    <div
      className={`modal-root ${fullscreen ? 'fullscreen' : ''}${closing ? ' closing' : ''}${className ? ` ${className}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'MyPayIndia'}
    >
      {!fullscreen && (
        <div className="modal-backdrop" onClick={handleClose} aria-hidden="true" />
      )}
      <div
        className="modal-panel"
        onAnimationEnd={() => { if (closing) { setClosing(false); onClose?.(); } }}
      >
        <header className="modal-header">
          <button
            className="modal-close"
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            <CloseIcon />
          </button>
          {title ? <h2 className="modal-title">{title}</h2> : <Logo height={28} className="modal-title-logo" />}
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