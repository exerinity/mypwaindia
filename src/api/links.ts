import type { AuthOpts } from './client.js';

interface CreateLinkBody {
  amount: number;
  note?: string;
}

export async function createLink({ token, env }: AuthOpts, { amount, note }: CreateLinkBody) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/payment-link/create', {
    method: 'POST',
    token,
    env,
    body: { amount, ...(note ? { note } : {}) },
  });
}

export async function listLinks({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/payment-link/list', { token, env });
}

export async function getLink(tokenStr: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/payment-link/get', { query: { token: tokenStr } });
}

export async function claimLink({ token, env }: AuthOpts, tokenStr: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/payment-link/claim', {
    method: 'POST',
    token,
    env,
    body: { token: tokenStr },
  });
}

export async function cancelLink({ token, env }: AuthOpts, tokenStr: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/payment-link/cancel', {
    method: 'POST',
    token,
    env,
    body: { token: tokenStr },
  });
}