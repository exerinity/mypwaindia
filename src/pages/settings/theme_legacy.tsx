import { useSettings } from '../../context/settings_ctx.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { THEME_DEFAULTS, CUSTOM_THEME_VARS } from './theme_presets.ts';
import type { BuiltinTheme } from './theme_presets.ts';
import { ThemeShareRow } from './theme_share.tsx';

export function LegacyThemeCreator() {
  const { settings, update } = useSettings();
  const colorsMod = useLazyModule(() => import('../../utils/colors.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;

  if (settings.theme !== 'custom') {
    return (
      <>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0 }}>
          The old creator edits the custom theme directly, so it needs the Custom preset to be active
        </p>
        <button
          className="secondary compact"
          onClick={() => {
            const base = THEME_DEFAULTS[settings.theme as BuiltinTheme] ?? THEME_DEFAULTS.dark;
            update({ theme: 'custom', customTheme: base });
          }}
        >
          Switch to custom, seeded from {settings.theme}
        </button>
      </>
    );
  }

  return (
    <>
      <label className="mt-0">Seed from</label>
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
      <ThemeShareRow />
    </>
  );
}
