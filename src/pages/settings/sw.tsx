import type { ChangeEvent } from 'react';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { InfoIcon } from '../../components/ui/icons.tsx';

export function SwSettings() {
  const { settings, update } = useSettings();
  const toast = useToast();

  async function getSwRegistration() {
    if (!('serviceWorker' in navigator)) return undefined;
    return navigator.serviceWorker.getRegistration();
  }

  async function handleDeleteSw() {
    const reg = await getSwRegistration();
    if (!reg) { toast.warning('No service worker is registered'); return; }
    await reg.unregister();
    toast.success('Service worker deleted');
  }

  async function handleDoNotRegisterSw() {
    update({ swEnabled: false });
    const reg = await getSwRegistration();
    if (reg) {
      await reg.unregister();
      toast.success('Service worker disabled and stopped');
    } else {
      toast.success('Service worker will not be registered');
    }
  }

  async function handleReloadSw() {
    const reg = await getSwRegistration();
    if (!reg) { toast.warning('No service worker is registered'); return; }
    await reg.update();
    toast.success('Checked for a service worker update');
  }

  async function handleSwToggle(e: ChangeEvent<HTMLInputElement>) {
    const enabled = e.target.checked;
    update({ swEnabled: enabled });
    if (!enabled) {
      const reg = await getSwRegistration();
      if (reg) await reg.unregister();
    } else {
      toast.success('The service worker will register when you reload the app');
    }
  }

  return (
    <>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        Manage the service worker. The service worker makes the app work offline and could speed up navigation, but it could also contribute to stale caches
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
        <InfoIcon />
        If you don't know what a service worker is, or are not experiencing any issues with updating/data, you should leave these settings alone.
      </div>

      {!('serviceWorker' in navigator) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
          <InfoIcon />
          <span>Your browser doesn't support service workers, so these settings won't do anything</span>
        </div>
      )}

      <div className="row spread" style={{ alignItems: 'center', padding: '10px 0' }}>
        <div>
          <strong>Use service worker</strong>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.875rem' }}>
            {settings.swEnabled ? 'Enabled' : 'Disabled (any active service worker will be stopped)'}
          </p>
        </div>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={settings.swEnabled}
            onChange={handleSwToggle}
          />
          <span className="toggle-track" />
        </label>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">Actions</h3>

      <div className="btn-row" style={{ marginTop: 4 }}>
        <button className="secondary" onClick={handleReloadSw}>
          Reload service worker
        </button>
        <button className="secondary danger" onClick={handleDoNotRegisterSw}>
          Do not register service worker
        </button>
        <button className="secondary danger" onClick={handleDeleteSw}>
          Delete service worker
        </button>
      </div>
      <p className="muted" style={{ fontSize: '0.85rem', marginTop: 12 }}>
        <strong>Reload</strong> checks for and installs an updated service worker<br></br>
        <strong>Do not register</strong> stops the active service worker and prevents it from
        registering again<br></br>
        <strong>Delete</strong> immediately unregisters and ends the active service worker
      </p>
    </>
  );
}
