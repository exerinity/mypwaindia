import { useCallback, useEffect, useRef, useState } from 'react';
import type { DependencyList } from 'react';
import { useDataCache } from '../context/data_cache_ctx.tsx';

interface UseCachedQueryOptions {
  skip?: boolean;
}

export function useCachedQuery<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  opts: UseCachedQueryOptions = {}
): { data: T | null; error: unknown; loading: boolean; refetch: () => Promise<void> } {
  const { skip = false } = opts;
  const { getCached, setCached } = useDataCache();
  const cached = cacheKey ? getCached<T>(cacheKey) : undefined;

  const [data, setData] = useState<T | null>(cached ?? null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!skip && cached === undefined);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const dataRef = useRef<T | null>(cached ?? null);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const run = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    if (dataRef.current === null) setLoading(true);
    const p = (async () => {
      try {
        const result = await fetcherRef.current();
        dataRef.current = result;
        setData(result);
        setError(null);
        if (cacheKey) setCached(cacheKey, result);
      } catch (e) {
        setError(e);
      } finally {
        setLoading(false);
        inFlightRef.current = null;
      }
    })();
    inFlightRef.current = p;
    return p;
  }, [cacheKey, setCached]);

  useEffect(() => {
    const seeded = cacheKey ? getCached<T>(cacheKey) : undefined;
    dataRef.current = seeded ?? null;
    setData(seeded ?? null);
    if (skip) {
      setLoading(false);
      return;
    }
    setLoading(seeded === undefined);
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, skip]);

  return { data, error, loading, refetch: run };
}
