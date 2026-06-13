import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

export function listSubscriptions({ token, env }: AuthOpts, status?: string) {
  return apiFetch('/api/v2/user/subscriptions/list', {
    token,
    env,
    ...(status ? { query: { status } } : {}),
  });
}

export function cancelSubscription({ token, env }: AuthOpts, subscription_id: string) {
  return apiFetch('/api/v2/user/subscriptions/cancel', {
    method: 'POST',
    token,
    env,
    body: { subscription_id },
  });
}

export function resumeSubscription({ token, env }: AuthOpts, subscription_id: string) {
  return apiFetch('/api/v2/user/subscriptions/resume', {
    method: 'POST',
    token,
    env,
    body: { subscription_id },
  });
}
