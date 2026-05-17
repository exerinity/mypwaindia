import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.tsx';
import { useAuth } from '../context/AuthContext.tsx';

export function useGlobalAutoRefresh(): void {
  const { settings } = useSettings() as { settings: { autoRefresh: boolean } };
  const { active, refreshActive } = useAuth() as { active: unknown; refreshActive: () => Promise<unknown> };

  useEffect(() => {
    if (!settings.autoRefresh || !active) return;
    const t = setInterval(() => {
      refreshActive().catch(() => { /* sex */ });
    }, 30000);
    return () => clearInterval(t);
  }, [settings.autoRefresh, active, refreshActive]);
}