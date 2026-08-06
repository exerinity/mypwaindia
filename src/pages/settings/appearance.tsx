import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { Settings } from '../../context/settings_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { InfoIcon, ChevronRight } from '../../components/ui/icons.tsx';
import { rememberAccent } from '../../utils/recent_accents.ts';
import { openThemePanel } from '../../utils/theme_panel_store.ts';
import { THEME_OPTIONS, THEME_DEFAULTS } from './theme_presets.ts';
import type { BuiltinTheme } from './theme_presets.ts';
import { LegacyThemeCreator } from './theme_legacy.tsx';

export function AppearanceSettings() {
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const colorsMod = useLazyModule(() => import('../../utils/colors.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;

  const [accentInput, setAccentInput] = useState(settings.accent);
  const [legacyOpen, setLegacyOpen] = useState(false);

  function applyAccent(hex: string) {
    const norm = normalizeHex(hex);
    if (!norm) { toast.error("That's not a valid hex color"); return; }
    update({ accent: norm });
    setAccentInput(norm);
    rememberAccent(norm);
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
              const noCustomYet = Object.keys(settings.customTheme).length === 0;
              if (opt.value === 'custom' && settings.theme !== 'custom' && noCustomYet) {
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

      {!settings.scambait && (
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button onClick={openThemePanel}>
            Customize theme
            <ChevronRight size={16} />
          </button>
        </div>
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
          <label className="mt-2">Legacy custom theme editor</label>
          <button
            className="mpi-tp-legacy-toggle"
            aria-expanded={legacyOpen}
            onClick={() => setLegacyOpen((o) => !o)}
          >
            <span>Legacy custom theme editor</span>
            <span className="mpi-tp-legacy-toggle-chevron"><ChevronRight size={16} /></span>
          </button>
          {legacyOpen && (
            <div className="mpi-tp-legacy-body">
              <LegacyThemeCreator />
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

          <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
          <h3 className="mt-0">Clanker drawer</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
            Clanker is an AI agent that does the same sort of things as MyCLiIndia, but in plain English. Enabling this will show a drawer for a small chat window
          </p>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Show the Clanker drawer</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.clankerDrawer}
                onChange={(e) => update({ clankerDrawer: e.target.checked })}
              />
              <span className="toggle-track" />
            </label>
          </div>

          <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
          <h3 className="mt-0">Converse drawer</h3>
          <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
            Converse lets you message other enrolled MyPayIndia users. Enabling this will show a drawer for a small chat window
          </p>
          <div className="row spread" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>Show the Converse drawer</span>
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.chatDrawer}
                onChange={(e) => update({ chatDrawer: e.target.checked })}
              />
              <span className="toggle-track" />
            </label>
          </div>

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
        </>
      )}
    </>
  );
}
