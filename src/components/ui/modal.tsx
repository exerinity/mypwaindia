import { useEffect, useCallback, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CloseIcon } from './icons.tsx';
import { Logo } from './logo.tsx';
import { modal_classes } from '../../styles/modal.stylex.ts';


interface ModalProps { open: boolean; onClose?: () => void; title?: string; fullscreen?: boolean; className?: string; bgIcon?: ReactNode; children: ReactNode }
export function Modal({ open, onClose, title, fullscreen = false, className, bgIcon, children }: ModalProps) {
  const [closing, setClosing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!closing) return;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      setClosing(false);
      onClose?.();
    };
    const running = panelRef.current?.getAnimations() ?? [];
    if (running.length === 0) { finish(); return; }
    Promise.allSettled(running.map((a) => a.finished)).then(finish);
    return () => { cancelled = true; };
  }, [closing, onClose]);

  if (!open && !closing) return null;

  const noanim = className?.split(/\s+/).includes('noanim') ?? false;
  const slide = className?.split(/\s+/).includes('slide') ?? false;
  const root_class = fullscreen
    ? noanim ? modal_classes.root_fullscreen_noanim : closing ? modal_classes.root_fullscreen_closing : modal_classes.root_fullscreen
    : noanim ? modal_classes.root_noanim : modal_classes.root;
  const panel_class = noanim
    ? modal_classes.panel_noanim
    : slide ? closing ? modal_classes.panel_slide_closing : modal_classes.panel_slide
    : fullscreen ? closing ? modal_classes.panel_fullscreen_closing : modal_classes.panel_fullscreen
    : closing ? modal_classes.panel_closing : modal_classes.panel;

  const node = (
    <div
      className={`modal-root ${fullscreen ? 'fullscreen' : ''}${closing ? ' closing' : ''}${className ? ` ${className}` : ''} ${root_class}`}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'MyPayIndia'}
    >
      {!fullscreen && (
        <div className={`modal-backdrop ${noanim ? modal_classes.backdrop_noanim : closing ? modal_classes.backdrop_closing : modal_classes.backdrop}`} onClick={handleClose} aria-hidden="true" />
      )}
      {fullscreen && bgIcon}
      <div className={`modal-panel ${panel_class}`} ref={panelRef}>
        <header className={`modal-header ${modal_classes.header}`}>
          <button
            className={`modal-close ${modal_classes.close}`}
            onClick={handleClose}
            aria-label="Close"
            type="button"
          >
            <CloseIcon />
          </button>
          {title ? <h2 className={`modal-title ${modal_classes.title}`}>{title}</h2> : <Logo height={28} className={`modal-title-logo ${modal_classes.title_logo}`} />}
          <div className={`modal-header-spacer ${modal_classes.header_spacer}`} />
        </header>
        <div className={`modal-body ${modal_classes.body}`}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
