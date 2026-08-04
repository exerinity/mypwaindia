import { useState, lazy } from 'react';
import { useSettings, HOME_PAGE_OPTIONS, DEFAULT_DASHBOARD_BUTTONS, DASHBOARD_BUTTON_STYLES } from '../../context/settings_ctx.tsx';
import type { DashboardButtonStyle } from '../../context/settings_ctx.tsx';
import { InfoIcon, PlusIcon, CloseIcon } from '../../components/ui/icons.tsx';

const FloatingInput = lazy(() => import('../../components/ui/floating_input.tsx').then((m) => ({ default: m.FloatingInput })));

export function HomeSettings() {
  const { settings, update } = useSettings();
  const [customHomeInput, setCustomHomeInput] = useState<string | null>(() =>
    HOME_PAGE_OPTIONS.some((o) => o.value === settings.homePage) ? null : settings.homePage
  );

  const inCustomMode = customHomeInput !== null;
  const selectValue = inCustomMode ? '__custom__' : settings.homePage;
  const commitCustom = (val: string) => { if (val.trim()) update({ homePage: val.trim() }); };

  return (
    <>
      <h3 className="mt-0">Default page</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        Change what page is loaded when you open the app
      </p>
      <label htmlFor="home-page-select">Home page</label>
      <div className="row gap-sm" style={{ marginTop: 6 }}>
        <select
          id="home-page-select"
          value={selectValue}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setCustomHomeInput('');
            } else {
              update({ homePage: e.target.value });
              setCustomHomeInput(null);
            }
          }}
        >
          {HOME_PAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
          <option value="__custom__">Something else...</option>
        </select>
      </div>
      {inCustomMode && (
        <FloatingInput
          label="Where?"
          type="text"
          value={customHomeInput}
          autoFocus
          onChange={(e) => setCustomHomeInput(e.target.value)}
          onBlur={() => commitCustom(customHomeInput)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitCustom(customHomeInput); }}
          style={{ maxWidth: 240 }}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
        <InfoIcon />
        <span>This will not execute if you visit a page, obviously</span>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">Speed dial</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 12, marginTop: 0 }}>
        Customize the action buttons shown on your dashboard (up to 5)
      </p>
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
}
