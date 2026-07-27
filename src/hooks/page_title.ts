import { useEffect } from 'react';

export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} / MyPayIndia`;
    return () => { document.title = 'MyPayIndia'; };
  }, [title]);
}