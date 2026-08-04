import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { WarningIcon } from '../../components/ui/icons.tsx';
import { formatRelative } from '../../utils/dates.js';

export function PortSettings() {
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [importJson, setImportJson] = useState('');
  const [syncBusy, setSyncBusy] = useState<'save' | 'load' | 'clear' | null>(null);
  const [remoteSavedAt, setRemoteSavedAt] = useState<string | null>(null);

  const applyJson = async (raw: string) => {
    const { parseSettingsExport, applySettingsImport } = await import('../../utils/settings_io.ts');
    const parsed = parseSettingsExport(raw);
    if (!parsed) { toast.error('That is not correct JSON'); return; }
    applySettingsImport(parsed, update);
    toast.success('Settings imported');
    setImportJson('');
  };

  const saveToAccount = async () => {
    if (!active) return;
    setSyncBusy('save');
    try {
      const { collectSettingsExport } = await import('../../utils/settings_io.ts');
      const { putRemoteSettings } = await import('../../api/settings_sync.ts');
      const res = await putRemoteSettings(active, collectSettingsExport(settings));
      setRemoteSavedAt(res.savedAt);
      toast.success('Settings saved to your account');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSyncBusy(null);
    }
  };

  const loadFromAccount = async () => {
    if (!active) return;
    setSyncBusy('load');
    try {
      const { getRemoteSettings } = await import('../../api/settings_sync.ts');
      const { settingsToSearchParams } = await import('../../utils/settings_io.ts');
      const res = await getRemoteSettings(active);
      if (!res.payload) {
        toast.warning("Couldn't find any settings saved for this account");
        return;
      }
      setRemoteSavedAt(res.savedAt);
      navigate(`/i/flow/settings?${settingsToSearchParams(res.payload)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSyncBusy(null);
    }
  };

  const clearFromAccount = async () => {
    if (!active) return;
    setSyncBusy('clear');
    try {
      const { deleteRemoteSettings } = await import('../../api/settings_sync.ts');
      await deleteRemoteSettings(active);
      setRemoteSavedAt(null);
      toast.success('Deleted saved settings');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not remove settings');
    } finally {
      setSyncBusy(null);
    }
  };

  return (
    <>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        Export, import and share your settings. This can be done in 4 methods; the first and third are the easiest.
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="mt-0 mb-0 alert alert-warning"><WarningIcon /><span>These are for the app settings, they have nothing to do with your MyPayIndia account. <a href="https://mypayindia.com/account/settings" target="_blank">Log in to MyPayIndia.com to change those...</a></span></div>

      <h3 className="mt-0">Save to your account</h3>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: 8 }}>
        {active
          ? 'Your settings will be saved and tied to your account ID'
          : 'Log in to save your settings against your MyPayIndia account'}
      </p>
      {remoteSavedAt && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 0, marginBottom: 8 }}>
          Last saved {formatRelative(remoteSavedAt)}
        </p>
      )}
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="secondary compact" disabled={!active || syncBusy !== null} onClick={saveToAccount}>
          {syncBusy === 'save' ? 'Saving data...' : 'Save to account'}
        </button>
        <button className="secondary compact" disabled={!active || syncBusy !== null} onClick={loadFromAccount}>
          {syncBusy === 'load' ? 'Retrieving data...' : 'Load from account'}
        </button>
        <button className="ghost compact" disabled={!active || syncBusy !== null} onClick={clearFromAccount}>
          {syncBusy === 'clear' ? 'Deleting...' : 'Disassociate from account'}
        </button>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">Copy &amp; paste</h3>
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="secondary compact" onClick={async () => {
          const { collectSettingsExport } = await import('../../utils/settings_io.ts');
          const json = JSON.stringify(collectSettingsExport(settings), null, 2);
          navigator.clipboard.writeText(json).then(
            () => toast.success('Settings JSON copied to clipboard'),
            () => toast.error('Copying failed, try exporting a file'),
          );
        }}>
          Copy settings in JSON
        </button>
      </div>
      <label htmlFor="settings-import-json" className="mt-2">Paste that JSON here:</label>
      <textarea
        id="settings-import-json"
        value={importJson}
        onChange={(e) => setImportJson(e.target.value)}
        placeholder='{ "settings": { ... } }'
        style={{ marginTop: 6, minHeight: 120, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.8rem' }}
      />
      <div className="btn-row" style={{ marginTop: 6 }}>
        <button className="secondary compact" disabled={!importJson.trim()} onClick={() => applyJson(importJson)}>
          Apply pasted JSON
        </button>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">JSON file</h3>
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="secondary compact" onClick={async () => {
          const { collectSettingsExport } = await import('../../utils/settings_io.ts');
          const json = JSON.stringify(collectSettingsExport(settings), null, 2);
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'mpi_settings.json';
          a.click();
          URL.revokeObjectURL(url);
        }}>
          Export file
        </button>
        <button className="secondary compact" onClick={() => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.json,application/json';
          input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => applyJson(e.target?.result as string);
            reader.readAsText(file);
          };
          input.click();
        }}>
          Import file
        </button>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">Shareable link (recommended)</h3>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 0, marginBottom: 8 }}>
        With this, you are able to choose what incoming settings are applied before accepting
      </p>
      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="secondary compact" onClick={async () => {
          const { collectSettingsExport, settingsToSearchParams } = await import('../../utils/settings_io.ts');
          const url = `https://mypayindia.sbs/i/flow/settings?${settingsToSearchParams(collectSettingsExport(settings))}`;
          navigator.clipboard.writeText(url).then(
            () => toast.success('Settings link copied to clipboard!'),
            () => toast.error('Copying failed, why not export a file?'),
          );
        }}>
          Generate link
        </button>
      </div>
    </>
  );
}
