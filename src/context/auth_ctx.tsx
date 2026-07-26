import { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage.ts';
import { useSettings } from './settings_ctx.tsx';
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
  credentialOnly?: boolean;
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
  switchingTo: Account | null;
  login: (params: LoginParams, redirectTo?: string) => Promise<Account>;
  logout: () => Promise<void>;
  switchAccount: (id: number) => Promise<void>;
  removeAccount: (id: number) => void;
  addOrReplaceAccount: (acc: Account) => void;
  saveCredentials: (params: { username: string; password: string; env?: Env }) => void;
  updateBalance: (id: number, balance: number) => void;
  updateAccountInfo: (id: number, info: Partial<Account>) => void;
  refreshActive: () => Promise<unknown>;
  maxAccounts: number;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function rememberInfoEnabled(): boolean {
  return storageGet<{ rememberInfo?: boolean }>(KEYS.SETTINGS, {}).rememberInfo ?? true;
}

function persistAccounts(next: Account[], remember: boolean = rememberInfoEnabled()) {
  if (remember) {
    storageSet(KEYS.ACCOUNTS, next);
    return;
  }
  storageSet(KEYS.ACCOUNTS, next.map((a) => ({
    id: a.id,
    username: a.username,
    role: '',
    token: a.token,
    env: a.env,
    addedAt: a.addedAt,
    password: a.password,
    credentialOnly: a.credentialOnly,
  })));
}

function setAccs(next: Account[]) {
  persistAccounts(next);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [accounts, setAccounts] = useState<Account[]>(() => storageGet(KEYS.ACCOUNTS, []));
  const [activeId, setActiveId] = useState<number | null>(() => storageGet(KEYS.ACTIVE_ACCOUNT, null));
  const [switchingTo, setSwitchingTo] = useState<Account | null>(null);

  const active = useMemo(
    () => accounts.find((a) => a.id === activeId) || null,
    [accounts, activeId]
  );

  const accountsRef = useRef(accounts);
  accountsRef.current = accounts;

  useEffect(() => {
    persistAccounts(accountsRef.current, settings.rememberInfo);
  }, [settings.rememberInfo]);

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

  const saveCredentials = useCallback(({ username, password, env = 'production' }: { username: string; password: string; env?: Env }) => {
    setAccounts((prev) => {
      if (prev.length >= MAX_ACCOUNTS) {
        throw new Error(`You can have at most ${MAX_ACCOUNTS} accounts saved!`);
      }
      const stub: Account = {
        id: -Date.now(),
        username,
        password,
        role: '',
        token: '',
        env,
        addedAt: new Date().toISOString(),
        credentialOnly: true,
      };
      const next = [...prev, stub];
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
    persistAccounts(next);
    storageSet(KEYS.ACTIVE_ACCOUNT, acc.id);
    window.location.replace(redirectTo ?? window.location.href);
    return acc;
  }, []);

  const switchAccount = useCallback(async (id: number) => {
    const all: Account[] = storageGet(KEYS.ACCOUNTS, []);
    const target = all.find((a) => a.id === id);
    setSwitchingTo(target ?? null);
    try { await apiLogout(); } catch (_) {}
    let nextActiveId = id;
    if (target?.password) {
      try {
        const data = await apiLogin({ username: target.username, password: target.password, env: target.env }) as LoginApiResponse;
        const realId = data.user.id;
        const current: Account[] = storageGet(KEYS.ACCOUNTS, []);
        // If a real account with this server ID already exists, activate that and drop the stub
        const existingReal = current.find((a) => a.id === realId && a.id !== id);
        if (existingReal) {
          persistAccounts(current
            .filter((a) => a.id !== id)
            .map((a) => a.id === realId ? { ...a, token: data.session_id } : a));
        } else {
          persistAccounts(current.map((a) => a.id === id ? {
            ...a,
            id: realId,
            token: data.session_id,
            role: data.user.role,
            username: data.user.username,
            credentialOnly: false,
          } : a));
        }
        nextActiveId = realId;
      } catch (_) {}
    }
    storageSet(KEYS.ACTIVE_ACCOUNT, nextActiveId);
    window.location.reload();
  }, []);

  const removeAccount = useCallback((id: number) => {
    const all: Account[] = storageGet(KEYS.ACCOUNTS, []);
    const remaining = all.filter((a) => a.id !== id);
    const nextId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    persistAccounts(remaining);
    storageSet(KEYS.ACTIVE_ACCOUNT, nextId);
    window.location.reload();
  }, []);

  const logout = useCallback(async () => {
    const id = activeId;
    await apiLogout();
    const remaining: Account[] = storageGet(KEYS.ACCOUNTS, []).filter((a: Account) => a.id !== id);
    const nextId = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    persistAccounts(remaining);
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
    const info = await getUserInfo(active) as { balance: number; first_name: string; last_name: string; role: string };
    updateAccountInfo(active.id, {
      lastBalance: info.balance,
      firstName: info.first_name,
      lastName: info.last_name,
      role: info.role,
    });
    return info;
  }, [active, updateAccountInfo]);

  const value = useMemo<AuthContextValue>(() => ({
    accounts,
    active,
    activeId,
    switchingTo,
    login,
    logout,
    switchAccount,
    removeAccount,
    addOrReplaceAccount,
    saveCredentials,
    updateBalance,
    updateAccountInfo,
    refreshActive,
    maxAccounts: MAX_ACCOUNTS,
  }), [accounts, active, activeId, switchingTo, login, logout, switchAccount, removeAccount, addOrReplaceAccount, saveCredentials, updateBalance, updateAccountInfo, refreshActive]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}
