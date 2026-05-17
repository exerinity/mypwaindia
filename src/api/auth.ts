import { apiFetch } from './client.js';
import type { Env } from './client.js';

interface LoginParams {
  username: string;
  password: string;
  totp_code?: string;
  env?: Env;
}

export function login({ username, password, totp_code, env }: LoginParams) {
  return apiFetch('/api/v2/auth/login', {
    method: 'POST',
    body: { username, password, ...(totp_code ? { totp_code } : {}) },
    env,
  });
}

export function logout() {
  return apiFetch('/api/logout', {
    method: 'POST',
  });
}