import { storageGet, storageSet, storageRemove, KEYS } from './storage.ts';

export type AppLockMethod = 'pin' | 'pattern' | 'password';

export interface AppLockConfig {
  enabled: boolean;
  method: AppLockMethod;
  hash: string;
  salt: string;
}

const MIN_LENGTH: Record<AppLockMethod, number> = {
  pin: 4,
  pattern: 4,
  password: 4,
};

export function minLength(method: AppLockMethod): number {
  return MIN_LENGTH[method];
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(secret: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${secret}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return bytesToHex(new Uint8Array(buf));
}

function randomSalt(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
}

export function getAppLockConfig(): AppLockConfig | null {
  return storageGet<AppLockConfig | null>(KEYS.APP_LOCK, null);
}

export function isAppLockEnabled(): boolean {
  return getAppLockConfig()?.enabled ?? false;
}

export async function setAppLock(method: AppLockMethod, secret: string): Promise<void> {
  const salt = randomSalt();
  const hash = await digest(secret, salt);
  storageSet(KEYS.APP_LOCK, { enabled: true, method, hash, salt } satisfies AppLockConfig);
}

export function disableAppLock(): void {
  storageRemove(KEYS.APP_LOCK);
}

export async function verifyAppLock(secret: string): Promise<boolean> {
  const config = getAppLockConfig();
  if (!config) return true;
  const attempt = await digest(secret, config.salt);
  return attempt === config.hash;
}
