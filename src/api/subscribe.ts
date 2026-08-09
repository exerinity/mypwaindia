export interface SubscriptionStatus {
  subscribed: boolean;
  status?: string | null;
  plan?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
}

export type SubscribePlan = 'clicker';

export async function checkSubscription(token: string, plan: SubscribePlan = 'clicker'): Promise<SubscriptionStatus> {
  const { SUBSCRIBE_BASE } = await import('./config.js');
  const res = await fetch(`${SUBSCRIBE_BASE}/status?plan=${plan}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!res.ok && res.status !== 401) throw new Error(`subscription check failed (HTTP ${res.status})`);
  return res.json() as Promise<SubscriptionStatus>;
}

export async function createSubscribeSession(token: string, plan: SubscribePlan = 'clicker'): Promise<{ checkout_url: string; session_id: string }> {
  const { SUBSCRIBE_BASE } = await import('./config.js');
  const res = await fetch(`${SUBSCRIBE_BASE}/subscribe`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const data = await res.json().catch(() => null) as { checkout_url?: string; session_id?: string; error?: string } | null;
  if (!res.ok || !data?.checkout_url) throw new Error(data?.error || `could not checkout (HTTP ${res.status})`);
  return { checkout_url: data.checkout_url, session_id: data.session_id! };
}
