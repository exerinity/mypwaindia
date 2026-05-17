import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

interface CreateLinkBody {
  amount: number;
  note?: string;
}

export function createLink({ token, env }: AuthOpts, { amount, note }: CreateLinkBody) {
  return apiFetch('/api/v2/payment-link/create', {
    method: 'POST',
    token,
    env,
    body: { amount, ...(note ? { note } : {}) },
  });
}

export function listLinks({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/payment-link/list', { token, env });
}

export function getLink(tokenStr: string) {
  return apiFetch('/api/v2/payment-link/get', { query: { token: tokenStr } });
}

export function claimLink({ token, env }: AuthOpts, tokenStr: string) {
  return apiFetch('/api/v2/payment-link/claim', {
    method: 'POST',
    token,
    env,
    body: { token: tokenStr },
  });
}

export function cancelLink({ token, env }: AuthOpts, tokenStr: string) {
  return apiFetch('/api/v2/payment-link/cancel', {
    method: 'POST',
    token,
    env,
    body: { token: tokenStr },
  });
}