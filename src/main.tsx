import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.tsx';
import { AuthProvider } from './context/auth_ctx.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { ToastProvider } from './context/toast_ctx.tsx';
import './styles/index.css';

function Root() {
  useEffect(() => {
    const el = document.getElementById('splash');
    if (!el) return;
    el.classList.add('out');
    const t = setTimeout(() => el.remove(), 500);
    return () => clearTimeout(t);
  }, []);

  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('mpi-meow')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);