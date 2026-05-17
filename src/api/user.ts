import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

export function getUserInfo({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/user/info', { token, env });
}

export function getRestrictions({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/user/restrictions', { token, env });
}

export function listSessions({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/user/session/list', { token, env });
}

export function invalidateSession({ token, env }: AuthOpts, session_id: string) {
  return apiFetch('/api/v2/user/session/invalidate', {
    method: 'POST',
    token,
    env,
    body: { session_id },
  });
}

export function verifyEmail({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/user/verify-email', { method: 'POST', token, env });
}