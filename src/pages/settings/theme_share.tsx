import { useSettings, CUSTOM_VAR_KEYS } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { normalizeHex } from '../../utils/colors.js';
import { effectivePalette } from './theme_presets.ts';

export function ThemeShareRow() {
  const { settings, update } = useSettings();
  const toast = useToast();

  function exportFile() {
    const palette = effectivePalette(settings.theme, settings.customTheme);
    const blob = new Blob([JSON.stringify(palette, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mpi_theme.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile() {
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
          update({ theme: 'custom', customTheme: filtered });
          toast.success('Theme imported');
        } catch {
          toast.error('Invalid theme');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function generateLink() {
    const palette = effectivePalette(settings.theme, settings.customTheme);
    const colorsHex = CUSTOM_VAR_KEYS.filter((k) => k !== '--shadow').map((k) => {
      const norm = normalizeHex(palette[k] ?? '');
      return (norm ?? '#000000').slice(1);
    }).join('');
    const accentHex = (normalizeHex(settings.accent) ?? '#d03505').slice(1);
    const url = `https://mypayindia.sbs/i/theme?id=${colorsHex}${accentHex}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success('Theme encoded into URL and copied'),
      () => toast.error('Copying failed, why not create a file?'),
    );
  }

  return (
    <div className="btn-row">
      <button className="secondary compact" onClick={exportFile}>Export file</button>
      <button className="secondary compact" onClick={importFile}>Import file</button>
      <button className="secondary compact" onClick={generateLink}>Generate link</button>
    </div>
  );
}
