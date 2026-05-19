import { useEffect, useRef } from 'react';
import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';

export function useGlobalAutoRefresh(): void {
  const { settings } = useSettings() as { settings: { autoRefresh: boolean; autoRefreshOnlyWhenFocused: boolean } };
  const { active, refreshActive } = useAuth() as { active: unknown; refreshActive: () => Promise<unknown> };
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!settings.autoRefresh || !active) return;

    const start = () => {
      if (timerRef.current !== null) return;
      timerRef.current = setInterval(() => {
        refreshActive().catch(() => {});
      }, 30000);
    };

    const stop = () => {
      if (timerRef.current === null) return;
      clearInterval(timerRef.current);
      timerRef.current = null;
    };

    const onVisibilityChange = () => {
      if (document.hidden) stop(); else start();
    };

    if (!settings.autoRefreshOnlyWhenFocused || !document.hidden) start();

    if (settings.autoRefreshOnlyWhenFocused) {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [settings.autoRefresh, settings.autoRefreshOnlyWhenFocused, active, refreshActive]);
}