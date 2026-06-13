import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type { ReactNode } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage.ts';
import { darken, isLight, normalizeHex } from '../utils/colors.js';
import { formatINR, formatMoney } from '../utils/money.js';

/** CSS custom-property keys that a custom theme may override. */
export const CUSTOM_VAR_KEYS = [
  '--bg', '--bg-elev', '--fg', '--muted', '--border',
  '--card', '--card-soft', '--pill-bg',
  '--success', '--error',
  '--alert-success', '--alert-error', '--alert-info', '--alert-warning',
  '--table-row-alt', '--shadow',
] as const;

/** shared list of pages */
export const HOME_PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '/dash', label: 'Dashboard' },
  { value: '/account', label: 'Account' },
  { value: '/account/transfer', label: 'Transfer funds' },
  { value: '/account/history', label: 'Full transaction history' },
  { value: '/account/restrictions', label: 'Active restrictions' },
  { value: '/dash/statements', label: 'Statements' },
  { value: '/dash/cards', label: 'Cards' },
  { value: '/links', label: 'Create a payment link' },
  { value: '/links/claim', label: 'Claim a payment link' },
  { value: '/settings/appearance', label: 'Settings' },
  { value: '/settings:old', label: 'Old settings' },
  { value: '/i/leaderboard', label: 'Leaderboard' },
  { value: '/i/team', label: 'Meet the team' },
  { value: '/i/release_notes', label: 'App release notes' },
  { value: '/i/acknowledgements', label: 'Acknowledgements' },
  { value: '/i/flow/mci', label: 'MyCLiIndia' },
  { value: '/iotm', label: 'Investment Opportunities™' },
  { value: '/iotm/button', label: 'The Button' },
];

export const DEFAULT_DASHBOARD_BUTTONS = [
  '/account/transfer',
  '/links',
  '/links/claim',
  '/account/history',
];

export interface Settings {
  theme: 'light' | 'dim' | 'dark' | 'custom';
  accent: string;
  autoRefresh: boolean;
  autoRefreshOnlyWhenFocused: boolean;
  autoUpdate: boolean;
  displayName: 'username' | 'first_name' | 'full_name';
  scambait: boolean;
  homePage: string;
  dashboardButtons: string[];
  customTheme: Record<string, string>;
  swEnabled: boolean;
}

interface SettingsContextValue {
  settings: Settings;
  update: (partial: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dim',
  accent: '#d03505',
  autoRefresh: true,
  autoRefreshOnlyWhenFocused: true,
  autoUpdate: false,
  displayName: 'username',
  scambait: false,
  homePage: '/dash',
  dashboardButtons: DEFAULT_DASHBOARD_BUTTONS,
  customTheme: {},
  swEnabled: true,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...storageGet(KEYS.SETTINGS, {} as Partial<Settings>),
  }));

  useEffect(() => {
    storageSet(KEYS.SETTINGS, settings);
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    CUSTOM_VAR_KEYS.forEach((k) => root.style.removeProperty(k));

    root.dataset.theme = settings.theme === 'custom' ? 'dark' : settings.theme;

    if (settings.theme === 'custom') {
      Object.entries(settings.customTheme).forEach(([k, v]) => {
        if (v) root.style.setProperty(k, v);
      });
    }

    const accent = normalizeHex(settings.accent) || DEFAULT_SETTINGS.accent;
    root.style.setProperty('--brand', accent);
    root.style.setProperty('--brand-dark', darken(accent, 0.15));
    root.style.setProperty('--brand-text', isLight(accent) ? '#000' : '#fff');
  }, [settings.theme, settings.accent, settings.customTheme]);

  const update = (partial: Partial<Settings>) => setSettings((s) => ({ ...s, ...partial }));
  const reset = () => setSettings(DEFAULT_SETTINGS);

  const value = useMemo<SettingsContextValue>(() => ({ settings, update, reset }), [settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings outside provider');
  return ctx;
}

export function useCurrency(): (paisa: number) => string {
  const { settings } = useSettings();
  return settings.scambait
    ? (paisa) => formatMoney(paisa, '$')
    : (paisa) => formatINR(paisa);
}
