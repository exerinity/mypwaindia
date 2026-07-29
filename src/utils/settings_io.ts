import { storageGet, storageSet, KEYS } from './storage.ts';
import { DEFAULT_SETTINGS, HOME_PAGE_OPTIONS, normalizeDashboardButtons, normalizeBottomNavItems } from '../context/settings_ctx.tsx';
import type { Settings } from '../context/settings_ctx.tsx';
import { findDestination } from '../components/nav_catalog.tsx';

export interface SettingsExport {
  v: 1;
  settings: Partial<Settings>;
  hide: Record<string, boolean>;
  onboard: number;
}

let pageLabels: Record<string, string> | null = null;
function pageLabel(value: string): string {
  if (!pageLabels) pageLabels = Object.fromEntries(HOME_PAGE_OPTIONS.map((o) => [o.value, o.label]));
  return pageLabels[value] ?? value;
}

export const SETTINGS_FIELD_LABELS: { key: keyof Settings; label: string }[] = [
  { key: 'theme', label: 'Theme' },
  { key: 'accent', label: 'Accent color' },
  { key: 'customTheme', label: 'Custom theme colors' },
  { key: 'displayName', label: 'Display name format' },
  { key: 'homePage', label: 'Home page' },
  { key: 'dashboardButtons', label: 'Dashboard action buttons' },
  { key: 'bottomNav', label: 'Bottom navigation bar' },
  { key: 'bottomNavForce', label: 'Bottom navigation on any screen size' },
  { key: 'bottomNavLabels', label: 'Bottom navigation labels' },
  { key: 'bottomNavItems', label: 'Bottom navigation items' },
  { key: 'autoRefresh', label: 'Auto-refresh data' },
  { key: 'autoRefreshOnlyWhenFocused', label: 'Auto-refresh only when focused' },
  { key: 'autoUpdate', label: 'Auto-update app' },
  { key: 'suppressUpdateToast', label: 'Suppress update notification' },
  { key: 'swEnabled', label: 'Service worker enabled' },
  { key: 'cliDrawer', label: 'MyCLiIndia drawer' },
  { key: 'scambait', label: 'Scambait mode' },
];

export const HIDE_LABELS: Record<string, string> = {
  install: 'Install app pill',
  sbshint: 'Path shortcut tip',
  clickers: 'Active clickers dot',
  iotm_welcome: 'The Button welcome message',
};

export function describeHide(payload: SettingsExport): string {
  const parts = Object.entries(payload.hide)
    .filter(([, v]) => v)
    .map(([k]) => `${HIDE_LABELS[k] ?? k} hidden`);
  if (payload.onboard) parts.push('onboarding accepted');
  return parts.length ? parts.join(', ') : '(none)';
}

export function describeSettingValue(key: keyof Settings, value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (key === 'homePage' && typeof value === 'string') return pageLabel(value);
  if (key === 'dashboardButtons' && Array.isArray(value)) {
    const btns = normalizeDashboardButtons(value);
    return btns.length ? btns.map((b) => `${pageLabel(b.route)} (${b.style})`).join(', ') : '(none)';
  }
  if (key === 'bottomNavItems' && Array.isArray(value)) {
    const routes = normalizeBottomNavItems(value);
    return routes.length ? routes.map((r) => findDestination(r)?.label ?? pageLabel(r)).join(', ') : '(none)';
  }
  if (Array.isArray(value)) return value.length ? value.join(', ') : '(none)';
  if (value && typeof value === 'object') {
    const n = Object.keys(value).length;
    return n ? `${n} value${n === 1 ? '' : 's'}` : '(default)';
  }
  return String(value);
}

export function sanitizeSettings(raw: unknown): Partial<Settings> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (!(key in obj)) continue;
    const val = obj[key];
    if (Array.isArray(def)) {
      if (!Array.isArray(val)) continue;
      if (key === 'dashboardButtons') out[key] = normalizeDashboardButtons(val);
      else if (key === 'bottomNavItems') out[key] = normalizeBottomNavItems(val);
      else out[key] = val;
    } else if (def !== null && typeof def === 'object') {
      if (val && typeof val === 'object' && !Array.isArray(val)) out[key] = val;
    } else if (typeof val === typeof def) {
      out[key] = val;
    }
  }
  return out as Partial<Settings>;
}

export function collectSettingsExport(settings: Settings): SettingsExport {
  return {
    v: 1,
    settings,
    hide: storageGet<Record<string, boolean>>(KEYS.HIDE, {}),
    onboard: storageGet<number>(KEYS.ONBOARD, 0),
  };
}

export function parseSettingsExport(raw: string): SettingsExport | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const settingsRaw = data && typeof data === 'object' && 'settings' in data ? data.settings : data;
    const settings = sanitizeSettings(settingsRaw);
    if (Object.keys(settings).length === 0) return null;
    const hide = data && typeof data.hide === 'object' && data.hide !== null
      ? (data.hide as Record<string, boolean>)
      : {};
    const onboard = typeof data?.onboard === 'number' ? data.onboard : 0;
    return { v: 1, settings, hide, onboard };
  } catch {
    return null;
  }
}

const BOOL_KEYS: (keyof Settings)[] = [
  'autoRefresh', 'autoRefreshOnlyWhenFocused', 'autoUpdate', 'suppressUpdateToast', 'scambait', 'swEnabled', 'bottomNav', 'bottomNavForce', 'bottomNavLabels', 'cliDrawer',
];
const STRING_KEYS: (keyof Settings)[] = ['theme', 'accent', 'displayName', 'homePage'];

export function settingsToSearchParams(payload: SettingsExport): string {
  const p = new URLSearchParams();
  const s = payload.settings;
  for (const k of STRING_KEYS) if (s[k] !== undefined) p.set(k, String(s[k]));
  for (const k of BOOL_KEYS) if (s[k] !== undefined) p.set(k, s[k] ? 'true' : 'false');
  if (s.dashboardButtons) p.set('dashboardButtons', s.dashboardButtons.map((b) => `${b.style}:${b.route}`).join(','));
  if (s.bottomNavItems) p.set('bottomNavItems', s.bottomNavItems.join(','));
  if (s.customTheme) {
    for (const [k, v] of Object.entries(s.customTheme)) if (v) p.set(`ct.${k}`, v);
  }
  const hidden = Object.entries(payload.hide).filter(([, v]) => v).map(([k]) => k);
  if (hidden.length) p.set('hide', hidden.join(','));
  if (payload.onboard) p.set('onboard', String(payload.onboard));
  return p.toString();
}

export function searchParamsToExport(search: string): SettingsExport | null {
  const p = new URLSearchParams(search);
  const raw: Record<string, unknown> = {};
  for (const k of STRING_KEYS) { const v = p.get(k); if (v !== null) raw[k] = v; }
  for (const k of BOOL_KEYS) { const v = p.get(k); if (v !== null) raw[k] = v === 'true'; }
  const db = p.get('dashboardButtons');
  if (db !== null) {
    raw.dashboardButtons = db
      ? db.split(',').map((part) => {
          const idx = part.indexOf(':');
          return idx === -1 ? part : { style: part.slice(0, idx), route: part.slice(idx + 1) };
        })
      : [];
  }
  const bn = p.get('bottomNavItems');
  if (bn !== null) raw.bottomNavItems = bn ? bn.split(',').filter(Boolean) : [];
  const ct: Record<string, string> = {};
  for (const [k, v] of p.entries()) if (k.startsWith('ct.')) ct[k.slice(3)] = v;
  if (Object.keys(ct).length) raw.customTheme = ct;

  const settings = sanitizeSettings(raw);
  if (Object.keys(settings).length === 0) return null;

  const hide: Record<string, boolean> = {};
  const hideParam = p.get('hide');
  if (hideParam) for (const k of hideParam.split(',')) if (k) hide[k] = true;
  const onboard = Number(p.get('onboard')) || 0;
  return { v: 1, settings, hide, onboard };
}

export function applySettingsImport(
  payload: SettingsExport,
  update: (partial: Partial<Settings>) => void,
  opts: { keys?: (keyof Settings)[]; includeHide?: boolean; includeOnboard?: boolean } = {},
): void {
  const { keys, includeHide = true, includeOnboard = true } = opts;
  const partial: Partial<Settings> = {};
  for (const [k, v] of Object.entries(payload.settings)) {
    if (!keys || keys.includes(k as keyof Settings)) {
      (partial as Record<string, unknown>)[k] = v;
    }
  }
  if (Object.keys(partial).length) update(partial);
  if (includeHide && payload.hide && Object.keys(payload.hide).length) {
    storageSet(KEYS.HIDE, { ...storageGet<Record<string, boolean>>(KEYS.HIDE, {}), ...payload.hide });
  }
  if (includeOnboard && typeof payload.onboard === 'number') {
    storageSet(KEYS.ONBOARD, payload.onboard);
  }
}
