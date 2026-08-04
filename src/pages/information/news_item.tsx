import { Link, useParams } from 'react-router-dom';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { getNews } from '../../api/flow.js';
import { Skeleton, ErrorBox } from '../../components/ui/status.tsx';
import { ExternalIcon, ArrowLeftIcon } from '../../components/ui/icons.tsx';
import { RichHtml } from '../../components/ui/rich_html.tsx';
import { slugify, formatNewsDate, type NewsFeed } from '../../utils/news.ts';
import Flowback from '../../flow/shell_fallback.tsx';

export default function NewsItemPage() {
  const { slug } = useParams();
  const { data, loading, error } = useCachedQuery<NewsFeed>('news', () => getNews() as Promise<NewsFeed>, []);
  const item = data?.items.find((i) => slugify(i.title) === slug);

  usePageTitle(item?.title || 'News');

  return (
    <>
      <p className="mt-0 mb-0">
        <Link to="/i/news" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ArrowLeftIcon /> Back to news</Link>
      </p>

      {loading && !data ? (
        <div className="card mb-2">
          <Skeleton width={280} height={26} />
          <Skeleton width={120} height={13} style={{ marginTop: 10 }} />
          <Skeleton width="100%" height={100} style={{ marginTop: 16 }} />
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : !item ? (
        <Flowback />
      ) : (
        <div className="card mb-2">
          <div className="row spread" style={{ alignItems: 'baseline', gap: 8 }}>
            <h1 style={{ margin: 0 }}>{item.title}</h1>
            {item.pubDate && <span className="muted" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatNewsDate(item.pubDate)}</span>}
          </div>
          <RichHtml className="news-body" html={item.description} />
          {item.link && (
            <a href={item.link} target="_blank" rel="noopener noreferrer" className="muted" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.8rem', marginTop: 4 }}>
              View on MyPayIndia.com <ExternalIcon size={12} />
            </a>
          )}
        </div>
      )}
    </>
  );
}
