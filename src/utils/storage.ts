export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Fuck #unfuck
  }
}

export function storageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Unfuck #fuck
  }
}

export const KEYS = {
  ACCOUNTS: 'mpi_accounts',
  ACTIVE_ACCOUNT: 'mpi_active_account',
  SETTINGS: 'mpi_settings',
  ONBOARD: 'accepted_onboard',
};
