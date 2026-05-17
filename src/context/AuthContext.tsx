import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { storageGet, storageSet, KEYS } from '../utils/storage.js';
import { login as apiLogin, logout as apiLogout } from '../api/auth.js';
import { getUserInfo } from '../api/user.js';

const MAX_ACCOUNTS = 10;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(() => storageGet(KEYS.ACCOUNTS, []));
  const [activeId, setActiveId] = useState(() => storageGet(KEYS.ACTIVE_ACCOUNT, null));

  useEffect(() => { storageSet(KEYS.ACCOUNTS, accounts); }, [accounts]);
  useEffect(() => { storageSet(KEYS.ACTIVE_ACCOUNT, activeId); }, [activeId]);

  const active = useMemo(
    () => accounts.find((a) => a.id === activeId) || null,
    [accounts, activeId]
  );

  const addOrReplaceAccount = useCallback((acc) => {
    setAccounts((prev) => {
      const existing = prev.findIndex((a) => a.id === acc.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...prev[existing], ...acc };
        return next;
      }
      if (prev.length >= MAX_ACCOUNTS) {
        throw new Error(`You can have at most ${MAX_ACCOUNTS} accounts logged in. What's wrong with you?!`);
      }
      return [...prev, acc];
    });
  }, []);

  const login = useCallback(async ({ username, password, totp_code, env = 'production' }, redirectTo) => {
    try { await apiLogout(); } catch (_) {}
    const data = await apiLogin({ username, password, totp_code, env });
    const acc = {
      id: data.user.id,
      username: data.user.username,
      role: data.user.role,
      token: data.session_id,
      env,
      addedAt: new Date().toISOString(),
    };
    const existing = storageGet(KEYS.ACCOUNTS, []);
    const idx = existing.findIndex((a) => a.id === acc.id);
    const updated = idx >= 0
      ? existing.map((a, i) => (i === idx ? { ...a, ...acc } : a))
      : [...existing, acc];
    storageSet(KEYS.ACCOUNTS, updated);
    storageSet(KEYS.ACTIVE_ACCOUNT, acc.id);
    window.location.replace(redirectTo ?? window.location.href);
    return acc;
  }, []);

  const switchAccount = useCallback((id) => {
    storageSet(KEYS.ACTIVE_ACCOUNT, id);
    window.location.reload();
  }, []);

  const removeAccount = useCallback((id) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setActiveId((cur) => (cur === id ? null : cur));
  }, []);

  const logout = useCallback(async () => {
    const id = activeId;
    await apiLogout();
    const remaining = storageGet(KEYS.ACCOUNTS, []).filter((a) => a.id !== id);
    const nextActive = remaining.length > 0 ? remaining[remaining.length - 1].id : null;
    storageSet(KEYS.ACCOUNTS, remaining);
    storageSet(KEYS.ACTIVE_ACCOUNT, nextActive);
    window.location.replace('/i/flow/login');
  }, [activeId]);

  const updateAccountInfo = useCallback((id, info) => {
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...info } : a)));
  }, []);

  const updateBalance = useCallback((id, balance) => {
    updateAccountInfo(id, { lastBalance: balance });
  }, [updateAccountInfo]);

  const refreshActive = useCallback(async () => {
    if (!active) return null;
    try {
      const info = await getUserInfo(active);
      updateAccountInfo(active.id, {
        lastBalance: info.balance,
        firstName: info.first_name,
        lastName: info.last_name,
      });
      return info;
    } catch (e) {
      if (e?.code === 1001) {
        removeAccount(active.id);
      }
      throw e;
    }
  }, [active, updateAccountInfo, removeAccount]);

  const value = useMemo(() => ({
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside provider');
  return ctx;
}