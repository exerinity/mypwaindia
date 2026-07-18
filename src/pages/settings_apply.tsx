import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Flowback from '../flow/shell_fallback.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import type { Settings } from '../context/settings_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { useToast } from '../context/toast_ctx.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';

export default function SettingsApplyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { update } = useSettings();
  const toast = useToast();
  const settingsIo = useLazyModule(() => import('../utils/settings_io.ts'));

  const payload = useMemo(() => settingsIo ? settingsIo.searchParamsToExport(location.search) : null, [settingsIo, location.search]);

  const fields = useMemo(
    () => (payload && settingsIo ? settingsIo.SETTINGS_FIELD_LABELS.filter((f) => f.key in payload.settings) : []),
    [payload, settingsIo],
  );

  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const hasHide = !!payload && (Object.keys(payload.hide).length > 0 || !!payload.onboard);

  const includeState = useMemo(() => {
    const base: Record<string, boolean> = {};
    fields.forEach((f) => { base[f.key] = true; });
    if (hasHide) base['__hide'] = true;
    return { ...base, ...included };
  }, [fields, hasHide, included]);

  if (!settingsIo) return null;
  if (!payload) return <Flowback />;
  usePageTitle('Apply settings');

  const toggle = (key: string) =>
    setIncluded((s) => ({ ...s, [key]: !(includeState[key]) }));

  function handleApply() {
    const keys = fields.map((f) => f.key).filter((k) => includeState[k]) as (keyof Settings)[];
    if (keys.length === 0 && !includeState['__hide']) {
      toast.warning('Select something');
      return;
    }
    settingsIo!.applySettingsImport(payload!, update, {
      keys,
      includeHide: !!includeState['__hide'],
      includeOnboard: !!includeState['__hide'],
    });
    toast.success('Settings applied');
  }

  const rowStyle = (i: number) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 14px',
    borderTop: i > 0 ? '1px solid var(--border)' : undefined,
    fontSize: '0.875rem',
  } as const);

  return (
    <div className="mpi-themeap">
      <h1 className="mt-0">Apply these settings?</h1>
      <p className="mt-0 mb-0">
        You can pick exactly what gets applied before accepting.
      </p>
      <div className="card" style={{ maxWidth: 520 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          {fields.map((f, i) => (
            <label key={f.key} style={{ ...rowStyle(i), cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={!!includeState[f.key]}
                  onChange={() => toggle(f.key)}
                  style={{ width: 'auto', flexShrink: 0 }}
                />
                <span>{f.label}</span>
              </div>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'right', wordBreak: 'break-word', maxWidth: '55%' }}>
                {settingsIo.describeSettingValue(f.key, payload.settings[f.key])}
              </span>
            </label>
          ))}
          {hasHide && (
            <label style={{ ...rowStyle(fields.length), cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <input
                  type="checkbox"
                  checked={!!includeState['__hide']}
                  onChange={() => toggle('__hide')}
                  style={{ width: 'auto', flexShrink: 0 }}
                />
                <span>Elements</span>
              </div>
              <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'right', wordBreak: 'break-word', maxWidth: '55%' }}>
                {settingsIo.describeHide(payload)}
              </span>
            </label>
          )}
        </div>

        <div className="btn-row">
          <button onClick={handleApply}>Apply</button>
          <button className="secondary" onClick={() => navigate('/dash')}>No</button>
        </div>
      </div>
    </div>
  );
}
