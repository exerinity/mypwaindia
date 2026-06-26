import type { AuthOpts } from './client.js';

interface TransferBody {
  recipient: string;
  amount: number;
  note?: string;
}

export async function transfer({ token, env }: AuthOpts, { recipient, amount, note }: TransferBody) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/transaction/transfer', {
    method: 'POST',
    token,
    env,
    body: { recipient, amount, ...(note ? { note } : {}) },
  });
}

export async function getTransaction({ token, env }: AuthOpts, id: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/transaction/get', { token, env, query: { id } });
}

export async function listTransactions({ token, env }: AuthOpts) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/transaction/list', { token, env });
}