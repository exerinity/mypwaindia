import { useCallback, useEffect, useRef, useState } from 'react';

interface UseRefreshTimerOptions {
  enabled: boolean;
  intervalSeconds?: number;
  pauseWhenHidden?: boolean;
}

export function useRefreshTimer(
  refetchFns: Array<() => unknown>,
  opts: UseRefreshTimerOptions
): { secondsLeft: number; refreshNow: () => void } {
  const { enabled, intervalSeconds = 30, pauseWhenHidden = false } = opts;
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const fnsRef = useRef(refetchFns);
  fnsRef.current = refetchFns;

  const runAll = useCallback(() => {
    for (const fn of fnsRef.current) fn();
  }, []);

  const refreshNow = useCallback(() => {
    runAll();
    setSecondsLeft(intervalSeconds);
  }, [runAll, intervalSeconds]);

  useEffect(() => {
    if (!enabled) {
      setSecondsLeft(intervalSeconds);
      return;
    }

    const tick = () => {
      if (pauseWhenHidden && document.hidden) return;
      setSecondsLeft((s) => {
        if (s <= 1) {
          runAll();
          return intervalSeconds;
        }
        return s - 1;
      });
    };

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [enabled, intervalSeconds, pauseWhenHidden, runAll]);

  return { secondsLeft, refreshNow };
}
