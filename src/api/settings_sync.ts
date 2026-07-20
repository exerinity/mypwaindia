import type { AuthOpts } from './client.js';
import type { SettingsExport } from '../utils/settings_io.ts';

export interface RemoteSettingsRecord {
  payload: SettingsExport | null;
  savedAt: string | null;
}

export async function getRemoteSettings({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch<RemoteSettingsRecord>('/pwa/settings', { token, env });
}

export async function putRemoteSettings({ token, env }: AuthOpts, payload: SettingsExport) {
  const { apiFetch } = await import('./client.js');
  return apiFetch<{ savedAt: string }>('/pwa/settings', {
    method: 'PUT',
    token,
    env,
    body: payload,
  });
}

export async function deleteRemoteSettings({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch<{ deleted: boolean }>('/pwa/settings', { method: 'DELETE', token, env });
}
