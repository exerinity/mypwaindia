import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Settings } from '../../context/settings_ctx.tsx';
import { useSettings, CUSTOM_VAR_KEYS } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { InfoIcon } from '../../components/icons.tsx';
import { THEME_OPTIONS, THEME_DEFAULTS, CUSTOM_THEME_VARS } from './theme_presets.ts';
import type { BuiltinTheme } from './theme_presets.ts';

export function AppearanceSettings() {
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const colorsMod = useLazyModule(() => import('../../utils/colors.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;

  const [accentInput, setAccentInput] = useState(settings.accent);

  function applyAccent(hex: string) {
    const norm = normalizeHex(hex);
    if (!norm) { toast.error("That's not a valid hex color"); return; }
    update({ accent: norm });
    setAccentInput(norm);
  }

  return (
    <>
      <h3 className="mt-0">Theme</h3><p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>Change the theme and accent color, or make your own</p>
      <label>Preset</label>
      <div className="btn-row">
        {THEME_OPTIONS.filter((opt) => !settings.scambait || opt.value !== 'custom').map((opt) => (
          <button
            key={opt.value}
            className={settings.theme === opt.value ? '' : 'secondary'}
            onClick={() => {
              if (opt.value === 'custom' && settings.theme !== 'custom') {
                const base = THEME_DEFAULTS[settings.theme as BuiltinTheme] ?? THEME_DEFAULTS.dark;
                update({ theme: 'custom', customTheme: base });
              } else {
                update({ theme: opt.value });
              }
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {settings.theme === 'custom' && (
        <>
          <label className="mt-2">Seed from</label>
          <div className="btn-row">
            {(['light', 'dim', 'dark'] as BuiltinTheme[]).map((t) => (
              <button key={t} className="secondary compact"
                onClick={() => update({ customTheme: THEME_DEFAULTS[t] })}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <label className="mt-2">Colors</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', marginTop: 6 }}>
            {CUSTOM_THEME_VARS.filter((v) => v.isColor).map(({ key, label }) => {
              const raw = settings.customTheme[key] ?? '';
              const def = THEME_DEFAULTS.dark[key];
              const isDefault = raw === def;
              return (
                <div key={key}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                  <div className="row gap-sm">
                    <input
                      type="color"
                      value={normalizeHex(raw) || '#000000'}
                      onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                    />
                    <input
                      type="text"
                      value={raw}
                      onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                      placeholder="#000000"
                      style={{ maxWidth: 88 }}
                    />
                    <button
                      className="secondary compact"
                      disabled={isDefault}
                      onClick={() => update({ customTheme: { ...settings.customTheme, [key]: def } })}
                      title={`Reset to default (based on Dark) (${def})`}
                    >↺</button>
                  </div>
                </div>
              );
            })}
          </div>

          {CUSTOM_THEME_VARS.filter((v) => !v.isColor).map(({ key, label }) => {
            const def = THEME_DEFAULTS.dark[key];
            const val = settings.customTheme[key] ?? '';
            return (
              <div key={key} style={{ marginTop: 14 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                <div className="row gap-sm">
                  <input
                    type="text"
                    value={val}
                    onChange={(e) => update({ customTheme: { ...settings.customTheme, [key]: e.target.value } })}
                    placeholder="0 2px 8px rgba(0, 0, 0, 0.8)"
                    style={{ maxWidth: 340 }}
                  />
                  <button
                    className="secondary compact"
                    disabled={val === def}
                    onClick={() => update({ customTheme: { ...settings.customTheme, [key]: def } })}
                    title={`Reset to default (based on Dark)`}
                  >↺</button>
                </div>
              </div>
            );
          })}

          <label className="mt-2">Share</label>
          <div className="btn-row" style={{ marginTop: 4 }}>
            <button className="secondary compact" onClick={() => {
              const blob = new Blob([JSON.stringify(settings.customTheme, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mpi_theme.json';
              a.click();
              URL.revokeObjectURL(url);
            }}>
              Export file
            </button>
            <button className="secondary compact" onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = '.json,application/json';
              input.onchange = () => {
                const file = input.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                  try {
                    const parsed = JSON.parse(e.target?.result as string);
                    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
                      throw new Error();
                    const filtered = Object.fromEntries(
                      Object.entries(parsed).filter(([k, v]) => typeof k === 'string' && k.startsWith('--') && typeof v === 'string')
                    ) as Record<string, string>;
                    update({ customTheme: filtered });
                    toast.success('Theme imported');
                  } catch {
                    toast.error('Invalid theme');
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            }}>
              Import file
            </button>
            <button className="secondary compact" onClick={() => {
              const colorKeys = CUSTOM_VAR_KEYS.filter((k) => k !== '--shadow');
              const colorsHex = colorKeys.map((k) => {
                const norm = normalizeHex(settings.customTheme[k] ?? '');
                return (norm ?? '#000000').slice(1);
              }).join('');
              const accentHex = (normalizeHex(settings.accent) ?? '#d03505').slice(1);
              const url = `https://mypayindia.sbs/i/flow/theme?id=${colorsHex}${accentHex}`;
              navigator.clipboard.writeText(url).then(
                () => toast.success('Theme encoded into URL and copied'),
                () => toast.error('Copying failed, why not create a file?'),
              );
            }}>
              Generate link
            </button>
          </div>
        </>
      )}

      <label className="mt-2">Accent color</label>
      <div className="row gap-sm">
        <input
          type="color"
          value={normalizeHex(accentInput) || '#d03505'}
          onChange={(e) => applyAccent(e.target.value)}
        />
        <input
          type="text"
          value={accentInput}
          onChange={(e) => setAccentInput(e.target.value)}
          onBlur={() => applyAccent(accentInput)}
          placeholder="#d03505"
          style={{ maxWidth: 160 }}
        />
        <button className="secondary compact" onClick={() => applyAccent('#d03505')}>
          Default
        </button>
      </div>

      {!settings.scambait && (
        <>
          <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
          <h3 className="mt-0">Display name</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
            Change how your name appears throughout the app
          </p>
          <div className="btn-row">
            {(
              [
                { value: 'username', label: 'Username' },
                { value: 'first_name', label: 'First name' },
                { value: 'full_name', label: 'Full name' },
              ] as { value: Settings['displayName']; label: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                className={settings.displayName === opt.value ? '' : 'secondary'}
                onClick={() => update({ displayName: opt.value })}
                disabled={!active}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!active && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
              <InfoIcon />
              <span>To use this setting, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
            </div>
          )}

          <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
          <h3 className="mt-0">MyCLiIndia drawer</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
            MyCLiIndia is a UNIX-like command line interface for performing actions on MyPWAIndia. Enabling this will show a drawer for a small CLi window
          </p>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Show the MyCLiIndia drawer</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.cliDrawer}
                onChange={(e) => update({ cliDrawer: e.target.checked })}
              />
              <span className="toggle-track" />
            </label>
          </div>
        </>
      )}
    </>
  );
}
