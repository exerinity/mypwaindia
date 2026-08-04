import { useEffect, useRef } from 'react';

export function RichHtml({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
  }, [html]);

  return <div ref={ref} className={className} />;
}
