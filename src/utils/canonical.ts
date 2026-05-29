const BASE = 'https://mypayindia.sbs';

export function setCanonical(pathname: string = window.location.pathname): void {
  const url = BASE + pathname;

  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;

  let meta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('property', 'og:url');
    document.head.appendChild(meta);
  }
  meta.content = url;
}
