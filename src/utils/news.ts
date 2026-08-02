export interface NewsItem {
  title: string;
  link: string;
  guid: string;
  pubDate: string;
  description: string;
}

export interface NewsFeed {
  title: string;
  link: string;
  description: string;
  lastBuildDate: string;
  items: NewsItem[];
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatNewsDate(value: string): string {
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
