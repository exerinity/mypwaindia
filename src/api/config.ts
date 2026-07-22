const PREVIEW_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0'];

function isPreview(): boolean {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return PREVIEW_HOSTS.includes(host);
}

export const REMOTE_BASE = isPreview() ? '/i' : 'https://mypayindia.sbs/i';

export function getApiBase(): string {
  return REMOTE_BASE;
}

export function getSubscribeBase(): string {
  return isPreview() ? '/i/subscribe' : 'https://mypayindia.sbs/i/subscribe';
}

export const API_BASE = getApiBase();

export const SUBSCRIBE_BASE = getSubscribeBase();

// this fucking file was so controversial creating the original app omg