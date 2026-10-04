import { utility_classes } from '../../styles/utils.stylex.ts';
import { theme_panel_classes } from '../../styles/theme_panel.stylex.ts';
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
    <div className={`mpi-tp-swatches ${theme_panel_classes.tp_swatches}`}>
      {recents.map((hex) => (
        <button
          key={hex}
          type="button"
          className={`mpi-tp-swatch ${normalizeHex(current) === hex ? `is-on ${theme_panel_classes.tp_swatch_is_on}` : theme_panel_classes.tp_swatch}`}
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
      className={`mpi-tp ${closing ? `mpi-tp--closing ${theme_panel_classes.tp__closing}` : theme_panel_classes.tp}`}
      role="dialog"
      aria-label="Custom Theme"
    >
      <div className={`mpi-tp-head ${theme_panel_classes.tp_head}`}>
        <span className={`mpi-tp-head-title ${theme_panel_classes.tp_head_title}`}>Custom theme</span>
        <button className={`mpi-tp-icon-btn ${theme_panel_classes.tp_icon_btn}`} onClick={handleClose} aria-label="Close">
          <CloseIcon size={18} />
        </button>
      </div>

      <div className={`mpi-tp-progress ${theme_panel_classes.tp_progress}`}>
        {STEP_LABELS.map((text, i) => (
          <button
            key={text}
            type="button"
            className={`mpi-tp-step ${step === i + 1 ? `is-on ${theme_panel_classes.tp_step_is_on}` : `${theme_panel_classes.tp_step}${step > i + 1 ? ' is-done' : ''}`}`}
            onClick={() => setStep(i + 1)}
          >
            <span className={`mpi-tp-step-num ${step === i + 1 ? theme_panel_classes.tp_step_num_on : step > i + 1 ? theme_panel_classes.tp_step_num_done : theme_panel_classes.tp_step_num}`}>{i + 1}</span>
            <span className={`mpi-tp-step-text ${theme_panel_classes.tp_step_text}`}>{text}</span>
          </button>
        ))}
      </div>

      <div className={`mpi-tp-share ${theme_panel_classes.tp_share}`}>
        <ThemeShareRow />
      </div>

      <div className={`mpi-tp-preview ${theme_panel_classes.tp_preview}`} aria-hidden="true">
        <div className={`mpi-tp-preview-card ${theme_panel_classes.tp_preview_card}`}>
          <h1 className={`mpi-tp-preview-title ${theme_panel_classes.tp_preview_title}`}>Among Us</h1>
          <div className={`mpi-tp-preview-rows ${theme_panel_classes.tp_preview_rows}`}>
            <span className={`mpi-tp-preview-bar ${theme_panel_classes.tp_preview_bar}`} />
            <span className={`mpi-tp-preview-bar mpi-tp-preview-bar--muted ${theme_panel_classes.tp_preview_bar__muted}`} />
          </div>
          <div className={`mpi-tp-preview-controls ${theme_panel_classes.tp_preview_controls}`}>
            <span className={`mpi-tp-preview-btn ${theme_panel_classes.tp_preview_btn}`}>Send</span>
            <span className={`mpi-tp-preview-pill ${theme_panel_classes.tp_preview_pill}`}>67.01 INR</span>
            <span className={`mpi-tp-preview-dot ${theme_panel_classes.tp_preview_dot}`} style={{ background: 'var(--success)' }} />
            <span className={`mpi-tp-preview-dot ${theme_panel_classes.tp_preview_dot}`} style={{ background: 'var(--error)' }} />
            <span className={`mpi-tp-preview-dot ${theme_panel_classes.tp_preview_dot}`} style={{ background: 'var(--alert-info)' }} />
            <span className={`mpi-tp-preview-dot ${theme_panel_classes.tp_preview_dot}`} style={{ background: 'var(--alert-warning)' }} />
          </div>
        </div>
      </div>

      <div className={`mpi-tp-body ${theme_panel_classes.tp_body}`}>
        {step === 1 && (
          <>
            <h4 className={`mpi-tp-h ${theme_panel_classes.tp_h}`}>Pick an accent</h4>
            <p className={`mpi-tp-hint ${theme_panel_classes.tp_hint}`}>The color used for buttons, links, and anything highlighted</p>
            <div className={`mpi-tp-inline ${theme_panel_classes.tp_inline}`}>
              <input
                className={theme_panel_classes.tp_inline_color}
                type="color"
                value={normalizeHex(accentText) || DEFAULT_SETTINGS.accent}
                onChange={(e) => applyAccent(e.target.value)}
                onBlur={(e) => applyAccent(e.target.value, true)}
              />
              <input
                className={theme_panel_classes.tp_inline_text}
                type="text"
                value={accentText}
                onChange={(e) => { setAccentText(e.target.value); applyAccent(e.target.value); }}
                onBlur={() => applyAccent(accentText, true)}
                placeholder={DEFAULT_SETTINGS.accent}
                spellCheck={false}
              />
              <button className={`secondary compact ${theme_panel_classes.tp_inline_button}`} onClick={() => applyAccent(DEFAULT_SETTINGS.accent, true)}>
                Default
              </button>
            </div>
            {recents.length > 0 && (
              <>
                <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>Recents</div>
                {swatchRow((hex) => applyAccent(hex, true), settings.accent)}
              </>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h4 className={`mpi-tp-h ${theme_panel_classes.tp_h}`}>Pick a theme to seed from</h4>
            <p className={`mpi-tp-hint ${theme_panel_classes.tp_hint}`}>Start from one of the three built-ins, or build one around a color</p>

            <div className={`mpi-tp-seg ${theme_panel_classes.tp_seg}`}>
              <button
                className={baseKind === 'builtin' ? `is-on ${theme_panel_classes.tp_seg_button_on}` : theme_panel_classes.tp_seg_button}
                onClick={() => chooseBuiltin(base)}
              >
                Base
              </button>
              <button
                className={baseKind === 'generate' ? `is-on ${theme_panel_classes.tp_seg_button_on}` : theme_panel_classes.tp_seg_button}
                onClick={() => { setBaseKind('generate'); applyGenerated(genText, base, intensity); }}
              >
                Generate from color
              </button>
            </div>

            {baseKind === 'builtin' ? (
              <div className={`mpi-tp-tiles ${theme_panel_classes.tp_tiles}`}>
                {BUILTINS.map((t) => (
                  <button
                    key={t}
                    className={`mpi-tp-tile ${settings.theme === t ? `is-on ${theme_panel_classes.tp_tile_is_on}` : theme_panel_classes.tp_tile}`}
                    onClick={() => chooseBuiltin(t)}
                  >
                    <span
                      className={`mpi-tp-tile-art ${theme_panel_classes.tp_tile_art}`}
                      style={{ background: THEME_DEFAULTS[t]['--bg'], borderColor: THEME_DEFAULTS[t]['--border'] }}
                    >
                      <span className={theme_panel_classes.tp_tile_art_span} style={{ background: THEME_DEFAULTS[t]['--card'] }} />
                      <span className={theme_panel_classes.tp_tile_art_span_last} style={{ background: normalizeHex(settings.accent) || DEFAULT_SETTINGS.accent }} />
                    </span>
                    <span className={`mpi-tp-tile-label ${theme_panel_classes.tp_tile_label}`}>{label(t)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>Build from this color</div>
                <div className={`mpi-tp-inline ${theme_panel_classes.tp_inline}`}>
                  <input
                    className={theme_panel_classes.tp_inline_color}
                    type="color"
                    value={normalizeHex(genText) || DEFAULT_SETTINGS.accent}
                    onChange={(e) => { setGenText(e.target.value); applyGenerated(e.target.value, base, intensity); }}
                  />
                  <input
                    className={theme_panel_classes.tp_inline_text}
                    type="text"
                    value={genText}
                    onChange={(e) => { setGenText(e.target.value); applyGenerated(e.target.value, base, intensity); }}
                    placeholder={DEFAULT_SETTINGS.accent}
                    spellCheck={false}
                  />
                  <button
                    className={`secondary compact ${theme_panel_classes.tp_inline_button}`}
                    onClick={() => { setGenText(settings.accent); applyGenerated(settings.accent, base, intensity); }}
                  >
                    Use accent
                  </button>
                </div>
                {recents.length > 0 && (
                  <>
                    <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>Recents</div>
                    {swatchRow((hex) => { setGenText(hex); applyGenerated(hex, base, intensity); }, genText)}
                  </>
                )}

                <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>Mode</div>
                <div className={`mpi-tp-seg ${theme_panel_classes.tp_seg}`}>
                  {BUILTINS.map((t) => (
                    <button
                      key={t}
                      className={base === t ? `is-on ${theme_panel_classes.tp_seg_button_on}` : theme_panel_classes.tp_seg_button}
                      onClick={() => { setBase(t); applyGenerated(genText, t, intensity); }}
                    >
                      {label(t)}
                    </button>
                  ))}
                </div>

                <div className={`mpi-tp-slider-head ${theme_panel_classes.tp_slider_head}`}>
                  <span>Intensity</span>
                  <span className={`mono ${utility_classes.mono}`}>{Math.round(intensity * 100)}%</span>
                </div>
                <input
                  className={`mpi-tp-range ${theme_panel_classes.tp_range}`}
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
            <h4 className={`mpi-tp-h ${theme_panel_classes.tp_h}`}>Adjust individual colors</h4>
            <p className={`mpi-tp-hint ${theme_panel_classes.tp_hint}`}>Optional (your choices so far already filled these in)</p>

            <div className={`mpi-tp-vars ${theme_panel_classes.tp_vars}`}>
              {CUSTOM_THEME_VARS.filter((v) => v.isColor).map(({ key, label: name }) => {
                const value = palette[key] ?? '';
                const def = baseline[key] ?? THEME_DEFAULTS.dark[key];
                return (
                  <div key={key} className={`mpi-tp-var ${theme_panel_classes.tp_var}`}>
                    <span className={`mpi-tp-var-name ${theme_panel_classes.tp_var_name}`}>{name}</span>
                    <input
                      className={theme_panel_classes.tp_var_color}
                      type="color"
                      value={normalizeHex(value) || '#000000'}
                      onChange={(e) => setVar(key, e.target.value)}
                    />
                    <input
                      type="text"
                      className={`mpi-tp-var-hex ${theme_panel_classes.tp_var_hex}`}
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
                  <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>{name}</div>
                  <div className={`mpi-tp-inline ${theme_panel_classes.tp_inline}`}>
                    <input
                      className={theme_panel_classes.tp_inline_text}
                      type="text"
                      value={value}
                      onChange={(e) => setVar(key, e.target.value)}
                      placeholder="0 2px 8px rgba(0, 0, 0, 0.8)"
                      spellCheck={false}
                    />
                    <button
                      className={`secondary compact ${theme_panel_classes.tp_inline_button}`}
                      disabled={value === def}
                      onClick={() => setVar(key, def)}
                      title="Back to the value from your base theme"
                    >↺</button>
                  </div>
                </div>
              );
            })}

            <div className={`mpi-tp-label ${theme_panel_classes.tp_label}`}>Start over</div>
            <button className="secondary compact" onClick={resetDefaults}>Reset to defaults</button>
          </>
        )}
      </div>

      <div className={`mpi-tp-foot ${theme_panel_classes.tp_foot}`}>
        <button className={`mpi-tp-text-btn ${theme_panel_classes.tp_text_btn}`} onClick={revert} disabled={!dirty}>
          Abort
        </button>
        <div className={`mpi-tp-foot-actions ${theme_panel_classes.tp_foot_actions}`}>
          {step > 1 && (
            <button className="secondary compact" onClick={() => setStep(step - 1)}>
              <span className={`mpi-tp-chev-back ${theme_panel_classes.tp_chev_back}`}><ChevronRight size={15} /></span>
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
