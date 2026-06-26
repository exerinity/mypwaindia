import type { AuthOpts } from './client.js';

export async function listSubscriptions({ token, env }: AuthOpts, status?: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/subscriptions/list', {
    token,
    env,
    ...(status ? { query: { status } } : {}),
  });
}

export async function cancelSubscription({ token, env }: AuthOpts, subscription_id: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/subscriptions/cancel', {
    method: 'POST',
    token,
    env,
    body: { subscription_id },
  });
}

export async function resumeSubscription({ token, env }: AuthOpts, subscription_id: string) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/user/subscriptions/resume', {
    method: 'POST',
    token,
    env,
    body: { subscription_id },
  });
}
