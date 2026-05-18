const PREVIEW_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

export const REMOTE_BASE = 'https://bastion.mypayindia.sbs';

export function getApiBase(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  if (PREVIEW_HOSTS.includes(host)) {
    return 'http://localhost:3000';
  }
  return REMOTE_BASE;
}

export const API_BASE = getApiBase();

// this fucking file was so controversial creating the original app omg