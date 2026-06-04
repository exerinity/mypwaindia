import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSettings, CUSTOM_VAR_KEYS } from '../context/settings_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { useToast } from '../context/toast_ctx.tsx';
import { darken, isLight } from '../utils/colors.js';

const COLOR_VAR_KEYS = CUSTOM_VAR_KEYS.filter((k) => k !== '--shadow');

interface ParsedTheme {
  customTheme: Record<string, string>;
  accent: string;
}

function parseThemeParam(id: string | null): ParsedTheme | null {
  if (!id || !/^[0-9a-fA-F]{96}$/.test(id)) return null;
  const customTheme = Object.fromEntries(
    COLOR_VAR_KEYS.map((k, i) => [k, `#${id.slice(i * 6, i * 6 + 6).toLowerCase()}`])
  );
  const accent = `#${id.slice(90, 96).toLowerCase()}`;
  return { customTheme, accent };
}

const VAR_LABELS: Record<string, string> = {
  '--bg': 'Background',
  '--bg-elev': 'Elevated background',
  '--fg': 'Foreground',
  '--muted': 'Muted text',
  '--border': 'Border',
  '--card': 'Card',
  '--card-soft': 'Card (soft)',
  '--pill-bg': 'Pill background',
  '--success': 'Success',
  '--error': 'Error',
  '--alert-success': 'Alert: success',
  '--alert-error': 'Alert: error',
  '--alert-info': 'Alert: info',
  '--alert-warning': 'Alert: warning',
  '--table-row-alt': 'Table row alt',
  '--shadow': 'Shadow',
};

export default function ThemeApplyPage() {
  usePageTitle('Apply theme');
  const location = useLocation();
  const navigate = useNavigate();
  const { update } = useSettings();
  const toast = useToast();

  const id = new URLSearchParams(location.search).get('id');
  const parsed = useMemo(() => parseThemeParam(id), [id]);

  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!previewing || !parsed) return;
    const root = document.documentElement;
    const prev: Record<string, string> = {};
    const set = (k: string, v: string) => {
      prev[k] = root.style.getPropertyValue(k);
      root.style.setProperty(k, v);
    };
    Object.entries(parsed.customTheme).forEach(([k, v]) => set(k, v));
    set('--brand', parsed.accent);
    set('--brand-dark', darken(parsed.accent, 0.15));
    set('--brand-text', isLight(parsed.accent) ? '#000' : '#fff');
    return () => {
      Object.entries(prev).forEach(([k, v]) => {
        if (v) root.style.setProperty(k, v);
        else root.style.removeProperty(k);
      });
    };
  }, [previewing, parsed]);

  function handleApply() {
    update({ theme: 'custom', customTheme: parsed!.customTheme, accent: parsed!.accent });
    toast.success('Theme applied');
    navigate('/settings/appearance');
  }

  if (!parsed) {
    return (
      <div className="mpi-themeap">
        <h1 className="mt-0">Bad theme</h1>
        <p className="mt-0 mb-0">This theme is either corrupt, invalid, or you didn't apply one at all. Why not go make one?</p>
        <button className="secondary" onClick={() => navigate('/settings/appearance')}>Go to settings</button>
      </div>
    );
  }

  const entries = [
    ...Object.entries(parsed.customTheme),
    ['--accent', parsed.accent] as [string, string],
  ];

  return (
    <div className="mpi-themeap">
      <h1 className="mt-0">Apply this theme?</h1>
      <p className="mt-0 mb-0"><Link to="/settings/appearance">You can modify it further in settings</Link>. You can also create links just like this there too!</p>
      <div className="card" style={{ maxWidth: 480 }}>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 20 }}>
          {entries.map(([key, value], i) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 14px',
                borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                fontSize: '0.875rem',
              }}
            >
              <span>{key === '--accent' ? 'Accent color' : (VAR_LABELS[key] ?? key)}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: value,
                  border: '1px solid var(--border)',
                  flexShrink: 0,
                }} />
                <span className="mono" style={{ fontSize: '0.78rem' }}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="btn-row">
          <button onClick={handleApply}>Yes</button>
          <button
            className="secondary"
            onClick={() => setPreviewing((p) => !p)}
          >
            {previewing ? 'Stop' : 'Show me first'}
          </button>
          <button className="secondary" onClick={() => navigate('/dash')}>No</button>
        </div>
      </div>
    </div>
  );
}
