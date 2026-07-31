import { createContext, useContext, useEffect, useState, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { storageGet, storageSet, storageRemove, KEYS } from '../utils/storage.ts';
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

/** this list is used for /settings/home */
export const HOME_PAGE_OPTIONS: { value: string; label: string }[] = [
  { value: '/dash', label: 'Dashboard' },
  { value: '/account', label: 'Account' },
  { value: '/account/transfer', label: 'Transfer funds' },
  { value: '/account/history', label: 'Full transaction history' },
  { value: '/account/history/simple', label: 'Simple history' },
  { value: '/account/restrictions', label: 'Active restrictions' },
  { value: '/dash/statements', label: 'Statements' },
  { value: '/dash/cards', label: 'Cards' },
  { value: '/i/flow/links', label: 'Payment links' },
  { value: '/settings/appearance', label: 'Settings' },
  { value: '/i/leaderboard', label: 'Leaderboard' },
  { value: '/i/team', label: 'Meet the team' },
  { value: '/i/release_notes', label: 'App release notes' },
  { value: '/i/acknowledgements', label: 'Acknowledgements' },
  { value: '/i/flow/mci', label: 'MyCLiIndia' },
  { value: '/iotm', label: 'Investment Opportunities™' },
  { value: '/iotm/button', label: 'The Button' },
];

export type DashboardButtonStyle = 'primary' | 'secondary' | 'danger';

export interface DashboardButton {
  route: string;
  style: DashboardButtonStyle;
}

export const DASHBOARD_BUTTON_STYLES: { value: DashboardButtonStyle; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'danger', label: 'Danger' },
];

export const DEFAULT_DASHBOARD_BUTTONS: DashboardButton[] = [
  { route: '/account/transfer', style: 'primary' },
  { route: '/i/flow/links', style: 'secondary' },
  { route: '/account/history', style: 'secondary' },
];

const VALID_STYLES = new Set(DASHBOARD_BUTTON_STYLES.map((s) => s.value));

export function normalizeDashboardButtons(value: unknown): DashboardButton[] {
  if (!Array.isArray(value)) return [...DEFAULT_DASHBOARD_BUTTONS];
  return value.map((entry): DashboardButton => {
    if (typeof entry === 'string') return { route: entry, style: 'secondary' };
    if (entry && typeof entry === 'object') {
      const route = String((entry as DashboardButton).route ?? '');
      const style = (entry as DashboardButton).style;
      return { route, style: VALID_STYLES.has(style) ? style : 'secondary' };
    }
    return { route: '', style: 'secondary' };
  }).filter((b) => b.route);
}

export const BOTTOM_NAV_MAX = 6;

export const DEFAULT_BOTTOM_NAV_ITEMS: string[] = [
  '/dash',
  '/account',
  '/account/transfer',
  '/account/history',
  '/settings',
];

export function normalizeBottomNavItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [...DEFAULT_BOTTOM_NAV_ITEMS];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string') continue;
    const route = entry.trim();
    if (!route || seen.has(route)) continue;
    seen.add(route);
    out.push(route);
    if (out.length === BOTTOM_NAV_MAX) break;
  }
  return out;
}

export interface Settings {
  theme: 'light' | 'dim' | 'dark' | 'custom';
  accent: string;
  autoRefresh: boolean;
  autoRefreshOnlyWhenFocused: boolean;
  autoUpdate: boolean;
  suppressUpdateToast: boolean;
  displayName: 'username' | 'first_name' | 'full_name';
  scambait: boolean;
  homePage: string;
  dashboardButtons: DashboardButton[];
  bottomNav: boolean;
  bottomNavForce: boolean;
  bottomNavLabels: boolean;
  bottomNavItems: string[];
  customTheme: Record<string, string>;
  swEnabled: boolean;
  rememberInfo: boolean;
  cliDrawer: boolean;
  copyLinkOnCreate: boolean;
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
  suppressUpdateToast: false,
  displayName: 'username',
  scambait: false,
  homePage: '/dash',
  dashboardButtons: DEFAULT_DASHBOARD_BUTTONS,
  bottomNav: true,
  bottomNavForce: false,
  bottomNavLabels: true,
  bottomNavItems: DEFAULT_BOTTOM_NAV_ITEMS,
  customTheme: {},
  swEnabled: false,
  rememberInfo: true,
  cliDrawer: false,
  copyLinkOnCreate: true,
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const merged = { ...DEFAULT_SETTINGS, ...storageGet(KEYS.SETTINGS, {} as Partial<Settings>) };
    return {
      ...merged,
      dashboardButtons: normalizeDashboardButtons(merged.dashboardButtons),
      bottomNavItems: normalizeBottomNavItems(merged.bottomNavItems),
    };
  });

  const skipPersist = useRef(false);

  useEffect(() => {
    if (skipPersist.current) { skipPersist.current = false; return; }
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

    const surface = getComputedStyle(root).getPropertyValue('--bg').trim();
    if (surface) {
      document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', surface);
    }
  }, [settings.theme, settings.accent, settings.customTheme]);

  const update = (partial: Partial<Settings>) => setSettings((s) => ({ ...s, ...partial }));
  const reset = () => {
    skipPersist.current = true;
    storageRemove(KEYS.SETTINGS);
    setSettings({ ...DEFAULT_SETTINGS });
  };

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
