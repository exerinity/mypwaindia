import { utility_classes } from '../../styles/utils.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { form_classes } from '../../styles/forms.stylex.ts';
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
    rememberAccent(norm);
  }

  return (
    <>
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>Theme</h3><p className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>Change the theme and accent color, or make your own</p>
      <label>Preset</label>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
        {THEME_OPTIONS.map((opt) => (
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

      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`} style={{ marginTop: 14 }}>
        <button onClick={openThemePanel}>
          Customize theme
          <ChevronRight size={16} />
        </button>
      </div>

      <label className={`mt-2 ${utility_classes.mt_2}`}>Accent color</label>
      <div className={`row gap-sm ${utility_classes.gap_sm} ${utility_classes.row}`}>
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

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>MyCLiIndia drawer</h3>
      <p className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        MyCLiIndia is a command line interface for performing actions on MyPWAIndia. Enabling this will show a drawer for a small CLi window
      </p>
      <div className={`row spread ${utility_classes.spread} ${utility_classes.row}`} style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem' }}>Show the MyCLiIndia drawer</span>
        <label className={`toggle-switch ${form_classes.toggle_switch}`}>
          <input
            type="checkbox"
            checked={settings.cliDrawer}
            onChange={(e) => update({ cliDrawer: e.target.checked })}
          />
          <span className={`toggle-track ${form_classes.toggle_track}`} />
        </label>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>MyAgentIndia drawer</h3>
      <p className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        MyAgentIndia is a conversational assistant for checking information and performing actions on MyPayIndia. Enabling this will show it in a drawer
      </p>
      <div className={`row spread ${utility_classes.spread} ${utility_classes.row}`} style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem' }}>Show the MyAgentIndia drawer</span>
        <label className={`toggle-switch ${form_classes.toggle_switch}`}>
          <input
            type="checkbox"
            checked={settings.agentDrawer}
            onChange={(e) => update({ agentDrawer: e.target.checked })}
          />
          <span className={`toggle-track ${form_classes.toggle_track}`} />
        </label>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>Display name</h3>
      <p className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        Change how your name appears throughout the app
      </p>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className={`alert alert-info ${alert_classes.info}`}>
          <InfoIcon />
          <span>To use this setting, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
        </div>
      )}
    </>
  );
}
