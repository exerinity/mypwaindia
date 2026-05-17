import React, { useRef, useState, useCallback } from 'react';
import type { ReactNode, CSSProperties } from 'react';

const HOLD_MS = 2000;
const DRAIN_MS = 400;

interface HoldButtonProps {
  onConfirm: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  [key: string]: unknown;
}

export function HoldButton({ onConfirm, children, className, style, ...props }: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setHolding(false);
    setProgress(0);
  }, []);

  const startHold = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (rafRef.current) return;
    setHolding(true);
    startRef.current = performance.now();

    const tick = (now: number) => {
      const p = Math.min((now - (startRef.current ?? now)) / HOLD_MS, 1);
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
