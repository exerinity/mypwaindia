import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage.js';
import { darken, isLight, normalizeHex } from '../utils/colors.js';
import { formatINR, formatMoney } from '../utils/money.js';

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  theme: 'dark',
  accent: '#d03505',
  autoRefresh: true,
  displayName: 'username',
  scambait: false,
};

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...storageGet(KEYS.SETTINGS, {}),
  }));

  useEffect(() => {
    storageSet(KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;

    const accent = normalizeHex(settings.accent) || DEFAULT_SETTINGS.accent;
    root.style.setProperty('--brand', accent);
    root.style.setProperty('--brand-dark', darken(accent, 0.15));
    root.style.setProperty('--brand-text', isLight(accent) ? '#000' : '#fff');
  }, [settings.theme, settings.accent]);

  const update = (partial) => setSettings((s) => ({ ...s, ...partial }));
  const reset = () => setSettings(DEFAULT_SETTINGS);

  const value = useMemo(() => ({ settings, update, reset }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside provider');
  return ctx;
}

export function useCurrency() {
  const { settings } = useSettings();
  return settings.scambait
    ? (paisa) => formatMoney(paisa, '$')
    : (paisa) => formatINR(paisa);
}