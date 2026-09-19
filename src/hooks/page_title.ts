import { useEffect } from 'react';

const SITE_NAME = 'MyPayIndia';

export function usePageTitle(
  title: string | null | undefined,
  omitSuffix = false
): void {
  useEffect(() => {
    if (!title) return;
    document.title = omitSuffix ? title : `${title} / ${SITE_NAME}`;
    return () => { document.title = SITE_NAME; };
  }, [title, omitSuffix]);
}