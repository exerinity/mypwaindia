import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';

interface DataCacheValue {
  getCached: <T>(key: string) => T | undefined;
  setCached: <T>(key: string, data: T) => void;
}

const DataCacheContext = createContext<DataCacheValue | null>(null);

export function DataCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef(new Map<string, unknown>());

  const value: DataCacheValue = {
    getCached: <T,>(key: string) => cacheRef.current.get(key) as T | undefined,
    setCached: <T,>(key: string, data: T) => {
      cacheRef.current.set(key, data);
    },
  };

  return <DataCacheContext.Provider value={value}>{children}</DataCacheContext.Provider>;
}

export function useDataCache(): DataCacheValue {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error('useDataCache outside provider');
  return ctx;
}
