import type { AuthOpts } from './client.js';

export async function getUserInfo({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/info', { token, env });
}

export async function getRestrictions({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/restrictions', { token, env });
}

export async function listSessions({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/session/list', { token, env });
}

export async function invalidateSession({ token, env }: AuthOpts, session_id: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/session/invalidate', {
    method: 'POST',
    token,
    env,
    body: { session_id },
  });
}

export async function verifyEmail({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/verify-email', { method: 'POST', token, env });
}