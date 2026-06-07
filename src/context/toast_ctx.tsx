import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon, InfoIcon, SuccessIcon, ErrorIcon, WarningIcon } from '../components/icons.tsx';

const KIND_ICON = {
  info: InfoIcon,
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
} as const;

const EXIT_DURATION = 200;

type ToastKind = 'info' | 'success' | 'error' | 'warning';

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
  action?: ToastAction;
  leaving?: boolean;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (message: string, kind?: ToastKind, timeout?: number, action?: ToastAction) => number;
  remove: (id: number) => void;
  success: (message: string, timeout?: number) => number;
  error: (message: string, timeout?: number) => number;
  warning: (message: string, timeout?: number) => number;
  info: (message: string, timeout?: number) => number;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

interface TimerState {
  timeoutId: ReturnType<typeof setTimeout>;
  remaining: number;
  start: number;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, TimerState>());

  const remove = useCallback((id: number) => {
    timers.current.delete(id);
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer.timeoutId);
      timers.current.delete(id);
    }
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => remove(id), EXIT_DURATION);
  }, [remove]);

  const scheduleRemoval = useCallback((id: number, ms: number) => {
    const timeoutId = setTimeout(() => dismiss(id), ms);
    timers.current.set(id, { timeoutId, remaining: ms, start: Date.now() });
  }, [dismiss]);

  const pause = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    clearTimeout(timer.timeoutId);
    const remaining = Math.max(timer.remaining - (Date.now() - timer.start), 0);
    timers.current.set(id, { ...timer, remaining });
  }, []);

  const resume = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (!timer) return;
    const timeoutId = setTimeout(() => dismiss(id), timer.remaining);
    timers.current.set(id, { timeoutId, remaining: timer.remaining, start: Date.now() });
  }, [dismiss]);

  const push = useCallback((message: string, kind: ToastKind = 'info', timeout = 4000, action?: ToastAction): number => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind, action }]);
    if (timeout > 0) scheduleRemoval(id, timeout);
    return id;
  }, [scheduleRemoval]);

  const value = useMemo<ToastContextValue>(() => ({
    toasts,
    push,
    remove: dismiss,
    success: (m, t) => push(m, 'success', t),
    error: (m, t) => push(m, 'error', t),
    warning: (m, t) => push(m, 'warning', t),
    info: (m, t) => push(m, 'info', t),
  }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={dismiss} onPause={pause} onResume={resume} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose, onPause, onResume }: {
  toasts: Toast[];
  onClose: (id: number) => void;
  onPause: (id: number) => void;
  onResume: (id: number) => void;
}) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`alert alert-${t.kind} toast${t.leaving ? ' toast-leaving' : ''}`}
          onMouseEnter={() => onPause(t.id)}
          onMouseLeave={() => onResume(t.id)}
        >
          {(() => { const Icon = KIND_ICON[t.kind]; return <Icon size={16} />; })()}
          <span>{t.message}</span>
          {t.action && (
            <button className="toast-action" onClick={t.action.onClick}>{t.action.label}</button>
          )}
          <button className="toast-x" onClick={() => onClose(t.id)} aria-label="Close"><CloseIcon size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside provider');
  return ctx;
}
