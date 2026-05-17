import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { CloseIcon } from '../components/icons.tsx';

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message: string, kind: ToastKind = 'info', timeout = 4000, action?: ToastAction): number => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind, action }]);
    if (timeout > 0) setTimeout(() => remove(id), timeout);
    return id;
  }, [remove]);

  const value = useMemo<ToastContextValue>(() => ({
    toasts,
    push,
    remove,
    success: (m, t) => push(m, 'success', t),
    error: (m, t) => push(m, 'error', t),
    warning: (m, t) => push(m, 'warning', t),
    info: (m, t) => push(m, 'info', t),
  }), [toasts, push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={remove} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: number) => void }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`alert alert-${t.kind} toast`}>
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
