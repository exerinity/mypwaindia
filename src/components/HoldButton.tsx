import { useRef, useState, useCallback } from 'react';

const HOLD_MS = 2000;
const DRAIN_MS = 400;

export function HoldButton({ onConfirm, children, className, style, ...props }) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  const startHold = useCallback((e) => {
    e.preventDefault();
    if (rafRef.current) return;
    setHolding(true);
    startRef.current = performance.now();

    const tick = (now) => {
      const p = Math.min((now - startRef.current) / HOLD_MS, 1);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setHolding(false);
        setProgress(0);
        onConfirm();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [onConfirm]);

  return (
    <button
      className={className}
      style={{ position: 'relative', overflow: 'hidden', userSelect: 'none', ...style }}
      onMouseDown={startHold}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={startHold}
      onTouchEnd={stop}
      onTouchCancel={stop}
      {...props}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: `${progress * 100}%`,
          background: 'rgba(255, 255, 255, 0.22)',
          transition: holding ? 'none' : `width ${DRAIN_MS}ms ease`,
          pointerEvents: 'none',
        }}
      />
      <span style={{ position: 'relative' }}>{children}</span>
    </button>
  );
}
