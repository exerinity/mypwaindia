export function storageGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Fuck #unfuck
  }
}

export function storageRemove(key) {
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
};