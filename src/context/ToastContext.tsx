import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CloseIcon } from '../components/Icons.jsx';

const ToastContext = createContext(null);

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((message, kind = 'info', timeout = 4000) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, kind }]);
    if (timeout > 0) setTimeout(() => remove(id), timeout);
    return id;
  }, [remove]);

  const value = useMemo(() => ({
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

function ToastContainer({ toasts, onClose }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`alert alert-${t.kind} toast`}>
          <span>{t.message}</span>
          <button className="toast-x" onClick={() => onClose(t.id)} aria-label="Close"><CloseIcon size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast outside provider');
  return ctx;
}
