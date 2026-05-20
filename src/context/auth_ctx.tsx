import { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage.ts';
import { login as apiLogin, logout as apiLogout } from '../api/auth.js';
import { getUserInfo } from '../api/user.js';
import type { Env } from '../api/client.js';

const MAX_ACCOUNTS = 10;

export interface Account {
  id: number;
  username: string;
  role: string;
  token: string;
  env: Env;
  addedAt: string;
  firstName?: string;
  lastName?: string;
  lastBalance?: number;
  password?: string;
}

interface LoginParams {
  username: string;
  password: string;
  totp_code?: string;
  env?: Env;
}

interface LoginApiResponse {
  user: { id: number; username: string; role: string };
  session_id: string;
}

interface AuthContextValue {
  accounts: Account[];
  active: Account | null;
  activeId: number | null;
  login: (params: LoginParams, redirectTo?: string) => Promise<Account>;
  logout: () => Promise<void>;
  switchAccount: (id: number) => Promise<void>;
  removeAccount: (id: number) => void;
  addOrReplaceAccount: (acc: Account) => void;
  updateBalance: (id: number, balance: number) => void;
  updateAccountInfo: (id: number, info: Partial<Account>) => void;
  refreshActive: () => Promise<unknown>;
  maxAccounts: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setAccs(next: Account[]) {
  storageSet(KEYS.ACCOUNTS, next);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(() => storageGet(KEYS.ACCOUNTS, []));
  const [activeId, setActiveId] = useState<number | null>(() => storageGet(KEYS.ACTIVE_ACCOUNT, null));

  const active = useMemo(
    () => accounts.find((a) => a.id === activeId) || null,
    [accounts, activeId]
  );

  const addOrReplaceAccount = useCallback((acc: Account) => {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === acc.id);
      let next: Account[];
      if (idx >= 0) {
        next = prev.map((a, i) => (i === idx ? { ...a, ...acc } : a));
      } else {
        if (prev.length >= MAX_ACCOUNTS) {
          throw new Error(`You can have at most ${MAX_ACCOUNTS} accounts logged in. What's wrong with you?!`);
        }
        next = [...prev, acc];
      }
      setAccs(next);
      return next;
    });
  }, []);

  const login = useCallback(async ({ username, password, totp_code, env = 'production' }: LoginParams, redirectTo?: string): Promise<Account> => {
    const snapshot: Account[] = storageGet(KEYS.ACCOUNTS, []);
    const data = await apiLogin({ username, password, totp_code, env }) as LoginApiResponse;
    const acc: Account = {
      id: data.user.id,
      username: data.user.username,
      role: data.user.role,
      token: data.session_id,
      env,
      addedAt: new Date().toISOString(),
      password,
    };
    const idx = snapshot.findIndex((a) => a.id === acc.id);
    const next = idx >= 0
      ? snapshot.map((a, i) => (i === idx ? { ...a, ...acc } : a))
      : [...snapshot, acc];
    storageSet(KEYS.ACCOUNTS, next);
    storageSet(KEYS.ACTIVE_ACCOUNT, acc.id);
    window.location.replace(redirectTo ?? window.location.href);
    return acc;
  }, []);

  const switchAccount = useCallback(async (id: number) => {
    const all: Account[] = storageGet(KEYS.ACCOUNTS, []);
    const target = all.find((a) => a.id === id);
    try { await apiLogout(); } catch (_) {}
    if (target?.password) {
      try {
        const data = await apiLogin({ username: target.username, password: target.password, env: target.env }) as LoginApiResponse;
        const current: Account[] = storageGet(KEYS.ACCOUNTS, []);
        storageSet(KEYS.ACCOUNTS, current.map((a) => a.id === id ? { ...a, token: data.session_id } : a));
      } catch (_) {}
    }
    storageSet(KEYS.ACTIVE_ACCOUNT, id);
    window.location.reload();
  }, []);

  const removeAccount = useCallback((id: number) => {
    const all: Account[] = storageGet(KEYS.ACCOUNTS, []);
    const remaining = all.filter((a) => a.id !== id);
    const nextId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    storageSet(KEYS.ACCOUNTS, remaining);
    storageSet(KEYS.ACTIVE_ACCOUNT, nextId);
    window.location.reload();
  }, []);

  const logout = useCallback(async () => {
    const id = activeId;
    await apiLogout();
    const remaining: Account[] = storageGet(KEYS.ACCOUNTS, []).filter((a: Account) => a.id !== id);
    const nextId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    storageSet(KEYS.ACCOUNTS, remaining);
    storageSet(KEYS.ACTIVE_ACCOUNT, nextId);
    window.location.replace('/i/flow/login');
  }, [activeId]);

  const updateAccountInfo = useCallback((id: number, info: Partial<Account>) => {
    setAccounts((prev) => {
      const next = prev.map((a) => (a.id === id ? { ...a, ...info } : a));
      setAccs(next);
      return next;
    });
  }, []);

  const updateBalance = useCallback((id: number, balance: number) => {
    updateAccountInfo(id, { lastBalance: balance });
  }, [updateAccountInfo]);

  const refreshActive = useCallback(async () => {
    if (!active) return null;
    try {
      const info = await getUserInfo(active) as { balance: number; first_name: string; last_name: string };
      updateAccountInfo(active.id, {
        lastBalance: info.balance,
        firstName: info.first_name,
        lastName: info.last_name,
      });
      return info;
    } catch (e) {
      if ((e as { code?: number })?.code === 1001) {
        removeAccount(active.id);
      }
      throw e;
    }
  }, [active, updateAccountInfo, removeAccount]);

  const value = useMemo<AuthContextValue>(() => ({
    accounts,
    active,
    activeId,
    login,
    logout,
    switchAccount,
    removeAccount,
    addOrReplaceAccount,
    updateBalance,
    updateAccountInfo,
    refreshActive,
    maxAccounts: MAX_ACCOUNTS,
  }), [accounts, active, activeId, login, logout, switchAccount, removeAccount, addOrReplaceAccount, updateBalance, updateAccountInfo, refreshActive]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
