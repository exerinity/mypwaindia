import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './auth_ctx.tsx';
import { useSettings } from './settings_ctx.tsx';
import { getRestrictions } from '../api/user.js';
import { useRefreshTimer } from '../hooks/refresh_timer.js';
import { refreshConversations } from '../utils/converse_store.ts';

export interface UserInfo {
  balance: number;
  first_name: string;
  last_name: string;
  email: string;
  email_verified: boolean;
  date_of_birth?: string;
  created: string;
  mfa_enabled: boolean;
  username: string;
  role: string;
}

export interface Restrictions {
  restrictions: Record<string, { active: boolean; expires_at?: string; value?: unknown }>;
}

interface GlobalDataValue {
  userInfo: UserInfo | null;
  userInfoLoading: boolean;
  userInfoError: unknown;
  restrictions: Restrictions | null;
  restrictionsLoading: boolean;
  restrictionsError: unknown;
  refetchUserInfo: () => Promise<void>;
  refetchRestrictions: () => Promise<void>;
  secondsLeft: number;
  refreshNow: () => void;
}

const GlobalDataContext = createContext<GlobalDataValue | null>(null);

export function GlobalDataProvider({ children }: { children: ReactNode }) {
  const { active, refreshActive } = useAuth();
  const { settings } = useSettings();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(true);
  const [userInfoError, setUserInfoError] = useState<unknown>(null);

  const [restrictions, setRestrictions] = useState<Restrictions | null>(null);
  const [restrictionsLoading, setRestrictionsLoading] = useState(true);
  const [restrictionsError, setRestrictionsError] = useState<unknown>(null);

  const userInfoInFlight = useRef<Promise<void> | null>(null);
  const fetchUserInfo = useCallback(async () => {
    if (!active) return;
    if (userInfoInFlight.current) return userInfoInFlight.current;
    const p = (async () => {
      try {
        const info = await refreshActive() as UserInfo | null;
        setUserInfo(info);
        setUserInfoError(null);
      } catch (e) {
        setUserInfoError(e);
      } finally {
        setUserInfoLoading(false);
        userInfoInFlight.current = null;
      }
    })();
    userInfoInFlight.current = p;
    return p;
  }, [active, refreshActive]);

  const restrictionsInFlight = useRef<Promise<void> | null>(null);
  const fetchRestrictions = useCallback(async () => {
    if (!active) return;
    if (restrictionsInFlight.current) return restrictionsInFlight.current;
    const p = (async () => {
      try {
        const r = await getRestrictions(active) as Restrictions;
        setRestrictions(r);
        setRestrictionsError(null);
      } catch (e) {
        setRestrictionsError(e);
      } finally {
        setRestrictionsLoading(false);
        restrictionsInFlight.current = null;
      }
    })();
    restrictionsInFlight.current = p;
    return p;
  }, [active]);

  const fetchChatMessages = useCallback(async () => {
    if (!active) return;
    await refreshConversations(active.token).catch(() => {});
  }, [active]);

  useEffect(() => {
    if (!active) {
      setUserInfo(null);
      setUserInfoLoading(false);
      setRestrictions(null);
      setRestrictionsLoading(false);
      return;
    }
    setUserInfoLoading(true);
    setRestrictionsLoading(true);
    fetchUserInfo();
    fetchRestrictions();
    fetchChatMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.token]);

  const { secondsLeft, refreshNow } = useRefreshTimer([fetchUserInfo, fetchRestrictions, fetchChatMessages], {
    enabled: settings.autoRefresh && !!active,
    pauseWhenHidden: settings.autoRefreshOnlyWhenFocused,
  });

  const value: GlobalDataValue = {
    userInfo,
    userInfoLoading,
    userInfoError,
    restrictions,
    restrictionsLoading,
    restrictionsError,
    refetchUserInfo: fetchUserInfo,
    refetchRestrictions: fetchRestrictions,
    secondsLeft,
    refreshNow,
  };

  return <GlobalDataContext.Provider value={value}>{children}</GlobalDataContext.Provider>;
}

export function useGlobalData(): GlobalDataValue {
  const ctx = useContext(GlobalDataContext);
  if (!ctx) throw new Error('useGlobalData outside provider');
  return ctx;
}
