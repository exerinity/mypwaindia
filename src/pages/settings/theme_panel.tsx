import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSettings, DEFAULT_SETTINGS } from '../../context/settings_ctx.tsx';
import type { Settings } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { CloseIcon, ChevronRight, CheckIcon } from '../../components/ui/icons.tsx';
import { normalizeHex } from '../../utils/colors.js';
import { getRecentAccents, rememberAccent } from '../../utils/recent_accents.ts';
import {
  THEME_DEFAULTS, CUSTOM_THEME_VARS, DEFAULT_INTENSITY,
  generateTheme, effectivePalette,
} from './theme_presets.ts';
import type { BuiltinTheme } from './theme_presets.ts';
import { ThemeShareRow } from './theme_share.tsx';

const CLOSE_MS = 260;
const BUILTINS: BuiltinTheme[] = ['light', 'dim', 'dark'];
const STEP_LABELS = ['Accent', 'Base theme', 'Edit colors'];

type ThemeSnapshot = Pick<Settings, 'theme' | 'accent' | 'customTheme'>;

function label(theme: BuiltinTheme) {
  return theme.charAt(0).toUpperCase() + theme.slice(1);
}

export function ThemePanel({ onClose }: { onClose: () => void }) {
  const { settings, update } = useSettings();
  const toast = useToast();

  const snapshot = useRef<ThemeSnapshot>({
    theme: settings.theme,
    accent: settings.accent,
    customTheme: settings.customTheme,
  });

  const [closing, setClosing] = useState(false);
  const [step, setStep] = useState(1);
  const [recents, setRecents] = useState(getRecentAccents);

  const [accentText, setAccentText] = useState(settings.accent);
  const [baseKind, setBaseKind] = useState<'builtin' | 'generate'>('builtin');
  const [base, setBase] = useState<BuiltinTheme>(settings.theme === 'custom' ? 'dark' : settings.theme);
  const [genText, setGenText] = useState(settings.accent);
  const [intensity, setIntensity] = useState(DEFAULT_INTENSITY);
  const [baseline, setBaseline] = useState(() => effectivePalette(settings.theme, settings.customTheme));

  const palette = effectivePalette(settings.theme, settings.customTheme);
  const dirty = settings.theme !== snapshot.current.theme
    || settings.accent !== snapshot.current.accent
    || JSON.stringify(settings.customTheme) !== JSON.stringify(snapshot.current.customTheme);

  const handleClose = useCallback(() => setClosing(true), []);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(() => onCloseRef.current(), CLOSE_MS);
    return () => clearTimeout(t);
  }, [closing]);

  useEffect(() => {
    const root = document.documentElement;
    if (closing) delete root.dataset.themePanel;
    else root.dataset.themePanel = 'open';
    return () => { delete root.dataset.themePanel; };
  }, [closing]);

  const hintShown = useRef(false);

  useEffect(() => {
    if (hintShown.current) return;
    hintShown.current = true;
    toast.info('Try navigating out of settings to test your theme!');
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [handleClose]);

  function applyAccent(hex: string, remember = false) {
    const norm = normalizeHex(hex);
    if (!norm) return;
    update({ accent: norm });
    setAccentText(norm);
    if (remember) setRecents(rememberAccent(norm));
  }

  function chooseBuiltin(theme: BuiltinTheme) {
    setBaseKind('builtin');
    setBase(theme);
    setBaseline(THEME_DEFAULTS[theme]);
    update({ theme });
  }

  function applyGenerated(hex: string, from: BuiltinTheme, amount: number) {
    const norm = normalizeHex(hex);
    if (!norm) return;
    const generated = generateTheme(norm, from, amount);
    setBaseline(generated);
    update({ theme: 'custom', customTheme: generated });
  }

  function setVar(key: string, value: string) {
    update({ theme: 'custom', customTheme: { ...palette, [key]: value } });
  }

  function revert() {
    const snap = snapshot.current;
    update({ ...snap });
    setAccentText(snap.accent);
    setBase(snap.theme === 'custom' ? 'dark' : snap.theme);
    setBaseKind('builtin');
    setBaseline(effectivePalette(snap.theme, snap.customTheme));
  }

  function resetDefaults() {
    update({
      theme: DEFAULT_SETTINGS.theme,
      accent: DEFAULT_SETTINGS.accent,
      customTheme: {},
    });
    setAccentText(DEFAULT_SETTINGS.accent);
    setGenText(DEFAULT_SETTINGS.accent);
    setBase(DEFAULT_SETTINGS.theme as BuiltinTheme);
    setBaseKind('builtin');
    setIntensity(DEFAULT_INTENSITY);
    setBaseline(THEME_DEFAULTS[DEFAULT_SETTINGS.theme as BuiltinTheme]);
  }

  function next() {
    if (step === 1) setRecents(rememberAccent(settings.accent));
    if (step === 3) { handleClose(); return; }
    setStep(step + 1);
  }

  const swatchRow = (onPick: (hex: string) => void, current: string) => (
    <div className="mpi-tp-swatches">
      {recents.map((hex) => (
        <button
          key={hex}
          type="button"
          className={`mpi-tp-swatch${normalizeHex(current) === hex ? ' is-on' : ''}`}
          style={{ background: hex }}
          title={hex}
          aria-label={hex}
          onClick={() => onPick(hex)}
        />
      ))}
    </div>
  );

  const node = (
    <div
      className={`mpi-tp${closing ? ' mpi-tp--closing' : ''}`}
      role="dialog"
      aria-label="Custom Theme"
    >
      <div className="mpi-tp-head">
        <span className="mpi-tp-head-title">Custom theme</span>
        <button className="mpi-tp-icon-btn" onClick={handleClose} aria-label="Close">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className="mpi-tp-progress">
        {STEP_LABELS.map((text, i) => (
          <button
            key={text}
            type="button"
            className={`mpi-tp-step${step === i + 1 ? ' is-on' : ''}${step > i + 1 ? ' is-done' : ''}`}
            onClick={() => setStep(i + 1)}
          >
            <span className="mpi-tp-step-num">{i + 1}</span>
            <span className="mpi-tp-step-text">{text}</span>
          </button>
        ))}
      </div>

      <div className="mpi-tp-share">
        <ThemeShareRow />
      </div>

      <div className="mpi-tp-preview" aria-hidden="true">
        <div className="mpi-tp-preview-card">
          <h1 className="mpi-tp-preview-title">Among Us</h1>
          <div className="mpi-tp-preview-rows">
            <span className="mpi-tp-preview-bar" />
            <span className="mpi-tp-preview-bar mpi-tp-preview-bar--muted" />
          </div>
          <div className="mpi-tp-preview-controls">
            <span className="mpi-tp-preview-btn">Send</span>
            <span className="mpi-tp-preview-pill">67.01 INR</span>
            <span className="mpi-tp-preview-dot" style={{ background: 'var(--success)' }} />
            <span className="mpi-tp-preview-dot" style={{ background: 'var(--error)' }} />
            <span className="mpi-tp-preview-dot" style={{ background: 'var(--alert-info)' }} />
            <span className="mpi-tp-preview-dot" style={{ background: 'var(--alert-warning)' }} />
          </div>
        </div>
      </div>

      <div className="mpi-tp-body">
        {step === 1 && (
          <>
            <h4 className="mpi-tp-h">Pick an accent</h4>
            <p className="mpi-tp-hint">The color used for buttons, links, and anything highlighted</p>
            <div className="mpi-tp-inline">
              <input
                type="color"
                value={normalizeHex(accentText) || DEFAULT_SETTINGS.accent}
                onChange={(e) => applyAccent(e.target.value)}
                onBlur={(e) => applyAccent(e.target.value, true)}
              />
              <input
                type="text"
                value={accentText}
                onChange={(e) => { setAccentText(e.target.value); applyAccent(e.target.value); }}
                onBlur={() => applyAccent(accentText, true)}
                placeholder={DEFAULT_SETTINGS.accent}
                spellCheck={false}
              />
              <button className="secondary compact" onClick={() => applyAccent(DEFAULT_SETTINGS.accent, true)}>
                Default
              </button>
            </div>
            {recents.length > 0 && (
              <>
                <div className="mpi-tp-label">Recents</div>
                {swatchRow((hex) => applyAccent(hex, true), settings.accent)}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h4 className="mpi-tp-h">Pick a theme to seed from</h4>
            <p className="mpi-tp-hint">Start from one of the three built-ins, or build one around a color</p>

            <div className="mpi-tp-seg">
              <button
                className={baseKind === 'builtin' ? 'is-on' : ''}
                onClick={() => chooseBuiltin(base)}
              >
                Base
              </button>
              <button
                className={baseKind === 'generate' ? 'is-on' : ''}
                onClick={() => { setBaseKind('generate'); applyGenerated(genText, base, intensity); }}
              >
                Generate from color
              </button>
            </div>

            {baseKind === 'builtin' ? (
              <div className="mpi-tp-tiles">
                {BUILTINS.map((t) => (
                  <button
                    key={t}
                    className={`mpi-tp-tile${settings.theme === t ? ' is-on' : ''}`}
                    onClick={() => chooseBuiltin(t)}
                  >
                    <span
                      className="mpi-tp-tile-art"
                      style={{ background: THEME_DEFAULTS[t]['--bg'], borderColor: THEME_DEFAULTS[t]['--border'] }}
                    >
                      <span style={{ background: THEME_DEFAULTS[t]['--card'] }} />
                      <span style={{ background: normalizeHex(settings.accent) || DEFAULT_SETTINGS.accent }} />
                    </span>
                    <span className="mpi-tp-tile-label">{label(t)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="mpi-tp-label">Build from this color</div>
                <div className="mpi-tp-inline">
                  <input
                    type="color"
                    value={normalizeHex(genText) || DEFAULT_SETTINGS.accent}
                    onChange={(e) => { setGenText(e.target.value); applyGenerated(e.target.value, base, intensity); }}
                  />
                  <input
                    type="text"
                    value={genText}
                    onChange={(e) => { setGenText(e.target.value); applyGenerated(e.target.value, base, intensity); }}
                    placeholder={DEFAULT_SETTINGS.accent}
                    spellCheck={false}
                  />
                  <button
                    className="secondary compact"
                    onClick={() => { setGenText(settings.accent); applyGenerated(settings.accent, base, intensity); }}
                  >
                    Use accent
                  </button>
                </div>
                {recents.length > 0 && (
                  <>
                    <div className="mpi-tp-label">Recents</div>
                    {swatchRow((hex) => { setGenText(hex); applyGenerated(hex, base, intensity); }, genText)}
                  </>
                )}

                <div className="mpi-tp-label">Mode</div>
                <div className="mpi-tp-seg">
                  {BUILTINS.map((t) => (
                    <button
                      key={t}
                      className={base === t ? 'is-on' : ''}
                      onClick={() => { setBase(t); applyGenerated(genText, t, intensity); }}
                    >
                      {label(t)}
                    </button>
                  ))}
                </div>

                <div className="mpi-tp-slider-head">
                  <span>Intensity</span>
                  <span className="mono">{Math.round(intensity * 100)}%</span>
                </div>
                <input
                  className="mpi-tp-range"
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(intensity * 100)}
                  onChange={(e) => {
                    const amount = Number(e.target.value) / 100;
                    setIntensity(amount);
                    applyGenerated(genText, base, amount);
                  }}
                />
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h4 className="mpi-tp-h">Adjust individual colors</h4>
            <p className="mpi-tp-hint">Optional (your choices so far already filled these in)</p>

            <div className="mpi-tp-vars">
              {CUSTOM_THEME_VARS.filter((v) => v.isColor).map(({ key, label: name }) => {
                const value = palette[key] ?? '';
                const def = baseline[key] ?? THEME_DEFAULTS.dark[key];
                return (
                  <div key={key} className="mpi-tp-var">
                    <span className="mpi-tp-var-name">{name}</span>
                    <input
                      type="color"
                      value={normalizeHex(value) || '#000000'}
                      onChange={(e) => setVar(key, e.target.value)}
                    />
                    <input
                      type="text"
                      className="mpi-tp-var-hex"
                      value={value}
                      onChange={(e) => setVar(key, e.target.value)}
                      placeholder="#000000"
                      spellCheck={false}
                    />
                    <button
                      className="secondary compact"
                      disabled={value === def}
                      onClick={() => setVar(key, def)}
                      title={`Back to ${def}`}
                    >↺</button>
                  </div>
                );
              })}
            </div>

            {CUSTOM_THEME_VARS.filter((v) => !v.isColor).map(({ key, label: name }) => {
              const value = palette[key] ?? '';
              const def = baseline[key] ?? THEME_DEFAULTS.dark[key];
              return (
                <div key={key}>
                  <div className="mpi-tp-label">{name}</div>
                  <div className="mpi-tp-inline">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setVar(key, e.target.value)}
                      placeholder="0 2px 8px rgba(0, 0, 0, 0.8)"
                      spellCheck={false}
                    />
                    <button
                      className="secondary compact"
                      disabled={value === def}
                      onClick={() => setVar(key, def)}
                      title="Back to the value from your base theme"
                    >↺</button>
                  </div>
                </div>
              );
            })}

            <div className="mpi-tp-label">Start over</div>
            <button className="secondary compact" onClick={resetDefaults}>Reset to defaults</button>
          </>
        )}
      </div>

      <div className="mpi-tp-foot">
        <button className="mpi-tp-text-btn" onClick={revert} disabled={!dirty}>
          Abort
        </button>
        <div className="mpi-tp-foot-actions">
          {step > 1 && (
            <button className="secondary compact" onClick={() => setStep(step - 1)}>
              <span className="mpi-tp-chev-back"><ChevronRight size={15} /></span>
              Previous step
            </button>
          )}
          <button className="compact" onClick={next}>
            {step === 3 ? 'Finish wizard' : 'Next step'}
            {step === 3 ? <CheckIcon size={15} /> : <ChevronRight size={15} />}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export default ThemePanel;
