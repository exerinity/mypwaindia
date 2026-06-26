import React, { useEffect, useState, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app.tsx';
import { AuthProvider } from './context/auth_ctx.tsx';
import { SettingsProvider } from './context/settings_ctx.tsx';
import { ToastProvider } from './context/toast_ctx.tsx';
import { GlobalDataProvider } from './context/global_data_ctx.tsx';
import { DataCacheProvider } from './context/data_cache_ctx.tsx';
import { AppShellSkeleton } from './components/app_skeleton.tsx';
import { AppLockScreen } from './components/app_lock_screen.tsx';
import { getAppLockConfig } from './utils/app_lock.ts';
import './styles/index.css';

const ChunkErrorBoundary = lazy(() => import('./components/boundary_err.tsx').then((m) => ({ default: m.ChunkErrorBoundary })));

function AppGate() {
  const [config] = useState(() => getAppLockConfig());
  const [unlocked, setUnlocked] = useState(() => !config?.enabled);

  if (!unlocked && config) {
    return <AppLockScreen method={config.method} onUnlock={() => setUnlocked(true)} />;
  }
  return <App />;
}

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
      <Suspense fallback={<AppShellSkeleton />}>
        <ChunkErrorBoundary>
          <SettingsProvider>
            <AuthProvider>
              <ToastProvider>
                <DataCacheProvider>
                  <GlobalDataProvider>
                    <AppGate />
                  </GlobalDataProvider>
                </DataCacheProvider>
              </ToastProvider>
            </AuthProvider>
          </SettingsProvider>
        </ChunkErrorBoundary>
      </Suspense>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById('mpi-meow')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);