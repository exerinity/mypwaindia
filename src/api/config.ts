const PREVIEW_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

export const REMOTE_BASE = 'https://bastion.mypayindia.sbs';

function isPreview(): boolean {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return PREVIEW_HOSTS.includes(host);
}

export function getApiBase(): string {
  return isPreview() ? 'http://localhost:3000' : REMOTE_BASE;
}

export function getSubscribeBase(): string {
  return isPreview() ? 'http://localhost:6769' : 'https://subscribe.mypayindia.sbs';
}

export const API_BASE = getApiBase();

export const SUBSCRIBE_BASE = getSubscribeBase();

// this fucking file was so controversial creating the original app omg