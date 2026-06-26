import { useEffect, useState } from 'react';

export function useLazyModule<T>(loader: () => Promise<T>): T | null {
  const [mod, setMod] = useState<T | null>(null);

  useEffect(() => {
    let active = true;
    loader().then((m) => { if (active) setMod(m); });
    return () => { active = false; };
  }, []);

  return mod;
}
