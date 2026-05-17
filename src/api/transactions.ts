import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

interface TransferBody {
  recipient: string;
  amount: number;
  note?: string;
}

export function transfer({ token, env }: AuthOpts, { recipient, amount, note }: TransferBody) {
  return apiFetch('/api/v2/transaction/transfer', {
    method: 'POST',
    token,
    env,
    body: { recipient, amount, ...(note ? { note } : {}) },
  });
}

export function getTransaction({ token, env }: AuthOpts, id: string) {
  return apiFetch('/api/v2/transaction/get', { token, env, query: { id } });
}

export function listTransactions({ token, env }: AuthOpts) {
  return apiFetch('/api/v2/transaction/list', { token, env });
}