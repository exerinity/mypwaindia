import type { Env } from './client.js';

interface LoginParams {
  username: string;
  password: string;
  totp_code?: string;
  env?: Env;
}

export async function login({ username, password, totp_code, env }: LoginParams) {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/auth/login', {
    method: 'POST',
    body: { username, password, ...(totp_code ? { totp_code } : {}) },
    env,
  });
}

export async function logout() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/logout', {
    method: 'POST',
  });
}