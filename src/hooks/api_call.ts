import { useState, useEffect, useCallback, useRef } from 'react';
import type { DependencyList } from 'react';

interface UseApiCallOptions {
  refresh?: boolean;
  intervalMs?: number;
  skip?: boolean;
}

export function useApiCall<T>(
  fetcher: () => Promise<T>,
  deps: DependencyList = [],
  opts: UseApiCallOptions = {}
): { data: T | null; error: unknown; loading: boolean; refetch: () => Promise<void> } {
  const { refresh = false, intervalMs = 30000, skip = false } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(!skip);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      return;
    }
    run();
  }, [...deps, skip]);

  useEffect(() => {
    if (!refresh || skip) return;
    const t = setInterval(run, intervalMs);
    return () => clearInterval(t);
  }, [refresh, intervalMs, run, skip]);

  return { data, error, loading, refetch: run };
}