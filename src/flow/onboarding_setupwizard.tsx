import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/modal.tsx';
import {
  useSettings,
  HOME_PAGE_OPTIONS,
  DEFAULT_DASHBOARD_BUTTONS,
  DASHBOARD_BUTTON_STYLES,
} from '../context/settings_ctx.tsx';
import type { Settings, DashboardButtonStyle } from '../context/settings_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { PlusIcon, CloseIcon, SuccessIcon, ArrowLeftIcon, ChevronRight } from '../components/ui/icons.tsx';

const THEME_OPTIONS: { value: Settings['theme']; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dim', label: 'Dim' },
  { value: 'dark', label: 'Dark' },
];

const STEP_LABELS = ['Theme', 'Speed dial', 'Default page', 'Updates', 'Syncing'];

export default function FinetunePage() {
  const navigate = useNavigate();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [accentInput, setAccentInput] = useState(settings.accent);
  const colorsMod = useLazyModule(() => import('../utils/colors.js'));
  const normalizeHex = (hex: string) => colorsMod ? colorsMod.normalizeHex(hex) : null;

  const totalSteps = STEP_LABELS.length;
  const done = step >= totalSteps;

  function applyAccent(hex: string) {
    const norm = normalizeHex(hex);
    if (!norm) return;
    update({ accent: norm });
    setAccentInput(norm);
  }

  function next() { setStep((s) => s + 1); }
  function back() { setStep((s) => Math.max(0, s - 1)); }
  function close() { navigate('/dash', { replace: true }); }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <>
            <h2 className="mt-0">Pick a theme</h2>
            <p className="muted" style={{ marginTop: 0 }}>You can create a custom theme later in Settings</p>
            <div className="btn-row">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={settings.theme === opt.value ? '' : 'secondary'}
                  onClick={() => update({ theme: opt.value })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
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
            </div>
          </>
        );

      case 1:
        return (
          <>
            <h2 className="mt-0">Speed dial</h2>
            <p className="muted" style={{ marginTop: 0 }}>Choose up to 5 quick-action buttons for your dashboard</p>
            {settings.dashboardButtons.map((btn, i) => (
              <div key={i} className="row gap-sm" style={{ marginTop: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
                <select
                  value={btn.route}
                  style={{ flex: 1, minWidth: 0 }}
                  onChange={(e) => {
                    const next = [...settings.dashboardButtons];
                    next[i] = { ...next[i], route: e.target.value };
                    update({ dashboardButtons: next });
                  }}
                >
                  {HOME_PAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={btn.style}
                  style={{ width: 130, flexShrink: 0 }}
                  aria-label="Button style"
                  onChange={(e) => {
                    const next = [...settings.dashboardButtons];
                    next[i] = { ...next[i], style: e.target.value as DashboardButtonStyle };
                    update({ dashboardButtons: next });
                  }}
                >
                  {DASHBOARD_BUTTON_STYLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  className="btn ghost"
                  style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
                  aria-label="Remove button"
                  onClick={() => update({ dashboardButtons: settings.dashboardButtons.filter((_, j) => j !== i) })}
                >
                  <CloseIcon size={16} />
                </button>
              </div>
            ))}
            <div className="row gap-sm" style={{ marginTop: 10 }}>
              {settings.dashboardButtons.length < 5 && (
                <button
                  className="btn secondary row gap-sm"
                  onClick={() => update({ dashboardButtons: [...settings.dashboardButtons, { route: HOME_PAGE_OPTIONS[0].value, style: 'secondary' }] })}
                >
                  <PlusIcon size={16} /> Add button
                </button>
              )}
              <button
                className="btn ghost"
                onClick={() => update({ dashboardButtons: [...DEFAULT_DASHBOARD_BUTTONS] })}
              >
                Reset to defaults
              </button>
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="mt-0">Default page</h2>
            <p className="muted" style={{ marginTop: 0 }}>What should load when you open the app?</p>
            <select
              value={settings.homePage}
              onChange={(e) => update({ homePage: e.target.value })}
            >
              {HOME_PAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="mt-0">Updates</h2>
            <p className="muted" style={{ marginTop: 0 }}>Should the app update itself when a new version is available?</p>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="ft-auto-update"
                checked={settings.autoUpdate}
                onChange={(e) => update({ autoUpdate: e.target.checked })}
              />
              <label htmlFor="ft-auto-update" style={{ margin: 0 }}>
                Yeah
              </label>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <h2 className="mt-0">Syncing</h2>
            <p className="muted" style={{ marginTop: 0 }}>Keep your data fresh in the background?</p>
            <div className="checkbox-row">
              <input
                type="checkbox"
                id="ft-auto-refresh"
                checked={settings.autoRefresh}
                onChange={(e) => update({ autoRefresh: e.target.checked })}
              />
              <label htmlFor="ft-auto-refresh" style={{ margin: 0 }}>
                Auto-refresh data (every 30 seconds)
              </label>
            </div>
          </>
        );

      default:
        return null;
    }
  }

  return (
    <Modal open onClose={close}>
      {!done && (
        <>
          <div className="row spread" style={{ marginBottom: 4 }}>
            <span className="muted" style={{ fontSize: '0.85rem' }}>Step {step + 1} of {totalSteps}</span>
            <span className="muted" style={{ fontSize: '0.85rem' }}>{STEP_LABELS[step]}</span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${((step + 1) / totalSteps) * 100}%`,
              background: 'var(--brand)',
              transition: 'width 0.2s',
            }} />
          </div>

          {renderStep()}

          <div className="modal-actions">
            <button className="secondary row gap-sm" onClick={back} disabled={step === 0}>
              <ArrowLeftIcon size={16} /> Back
            </button>
            <button className="row gap-sm" onClick={next}>
              {step === totalSteps - 1 ? 'Finish' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </>
      )}

      {done && (
        <div className="center" style={{ textAlign: 'center', padding: '12px 0' }}>
          <SuccessIcon size={40} />
          <h2>Setup finished</h2>
          <p>MyPWAIndia is now yours. Enjoy!</p>
          <button style={{ width: '100%', marginTop: 8 }} onClick={close}>
            OK let me in already
          </button>
        </div>
      )}
    </Modal>
  );
}
