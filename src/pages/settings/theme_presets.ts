import type { Settings } from '../../context/settings_ctx.tsx';
import { CUSTOM_VAR_KEYS } from '../../context/settings_ctx.tsx';

export const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Dark' },
  { value: 'custom', label: 'Custom' },
];

export type BuiltinTheme = 'light' | 'dim' | 'dark';

export const THEME_DEFAULTS: Record<BuiltinTheme, Record<string, string>> = {
  light: {
    '--bg': '#ffffff', '--bg-elev': '#f7f7f7', '--fg': '#222', '--muted': '#666',
    '--border': '#ddd', '--card': '#f7f7f7', '--card-soft': '#ffffff', '--pill-bg': '#ededed',
    '--success': '#0a7d26', '--error': '#d03505', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#fafafa', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.06)',
  },
  dim: {
    '--bg': '#121212', '--bg-elev': '#1d1d1d', '--fg': '#eaeaea', '--muted': '#aaa',
    '--border': '#333', '--card': '#1d1d1d', '--card-soft': '#1e1e1e', '--pill-bg': '#232323',
    '--success': '#4de68f', '--error': '#ff6b6b', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#181818', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.6)',
  },
  dark: {
    '--bg': '#000000', '--bg-elev': '#0a0a0a', '--fg': '#f0f0f0', '--muted': '#aaa',
    '--border': '#222', '--card': '#0a0a0a', '--card-soft': '#111', '--pill-bg': '#111',
    '--success': '#4de68f', '--error': '#ff6b6b', '--alert-success': '#3bd43f',
    '--alert-error': '#e63232', '--alert-info': '#2f8ffc', '--alert-warning': '#ffc300',
    '--table-row-alt': '#050505', '--shadow': '0 2px 8px rgba(0, 0, 0, 0.8)',
  },
};

export const CUSTOM_THEME_VARS: { key: typeof CUSTOM_VAR_KEYS[number]; label: string; isColor: boolean }[] = [
  { key: '--bg', label: 'Background', isColor: true },
  { key: '--bg-elev', label: 'Elevated background', isColor: true },
  { key: '--fg', label: 'Foreground', isColor: true },
  { key: '--muted', label: 'Muted text', isColor: true },
  { key: '--border', label: 'Border', isColor: true },
  { key: '--card', label: 'Card', isColor: true },
  { key: '--card-soft', label: 'Card (soft)', isColor: true },
  { key: '--pill-bg', label: 'Pill background', isColor: true },
  { key: '--success', label: 'Success', isColor: true },
  { key: '--error', label: 'Error', isColor: true },
  { key: '--alert-success', label: 'Alert: success', isColor: true },
  { key: '--alert-error', label: 'Alert: error', isColor: true },
  { key: '--alert-info', label: 'Alert: info', isColor: true },
  { key: '--alert-warning', label: 'Alert: warning', isColor: true },
  { key: '--table-row-alt', label: 'Table row alt', isColor: true },
  { key: '--shadow', label: 'Shadow', isColor: false },
];
