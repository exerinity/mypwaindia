import { useEffect } from 'react';

export function usePageTitle(title: string | null | undefined): void {
  useEffect(() => {
    document.title = title ? `${title} / MyPayIndia` : 'MyPayIndia';
    return () => { document.title = 'MyPayIndia'; };
  }, [title]);
}