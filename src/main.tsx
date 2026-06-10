import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.tsx';
import { AuthProvider } from './context/auth_ctx.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { ToastProvider } from './context/toast_ctx.tsx';
import { ChunkErrorBoundary } from './components/boundary_err.tsx';
import './styles/index.css';

function Root() {
  useEffect(() => {
    console.log(`loaded in ${(performance.now() - (window as any).__t0).toFixed(1)}ms`);
    const el = document.getElementById('splash');
    if (!el) return;
    el.classList.add('out');
    document.getElementById('mpi-meow')?.classList.add('in');
    const t = setTimeout(() => el.remove(), 550);
    return () => clearTimeout(t);
  }, []);

  return (
    <BrowserRouter>
      <ChunkErrorBoundary>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </ChunkErrorBoundary>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('mpi-meow')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);