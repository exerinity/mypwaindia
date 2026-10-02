import { useEffect, useRef, useState } from 'react';

export function use_profile_resource<T>(fetcher: () => Promise<T>, identity: string) {
  const [state, set_state] = useState<{ identity: string; data: T | null; error: unknown; loading: boolean }>({ identity, data: null, error: null, loading: true });
  const [revision, set_revision] = useState(0);
  const fetcher_ref = useRef(fetcher);
  fetcher_ref.current = fetcher;
  useEffect(() => {
    let cancelled = false;
    const fetch_resource = fetcher_ref.current;
    set_state({ identity, data: null, error: null, loading: true });
    Promise.resolve().then(fetch_resource).then(
      (data) => { if (!cancelled) set_state({ identity, data, error: null, loading: false }); },
      (error) => { if (!cancelled) set_state({ identity, data: null, error, loading: false }); },
    );
    return () => { cancelled = true; };
  }, [identity, revision]);
  const current = state.identity === identity ? state : { data: null, error: null, loading: true };
  return { ...current, reload: () => set_revision((value) => value + 1) };
}
