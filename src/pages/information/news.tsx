import { utility_classes } from '../../styles/utils.stylex.ts';
import { news_classes } from '../../styles/news.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { lbteam_classes } from '../../styles/lbteam.stylex.ts';
import { Link } from 'react-router-dom';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { getNews } from '../../api/flow.js';
import { Skeleton, ErrorBox, Empty } from '../../components/ui/status.tsx';
import { ExternalIcon } from '../../components/ui/icons.tsx';
import { RichHtml } from '../../components/ui/rich_html.tsx';
import { slugify, formatNewsDate, type NewsFeed } from '../../utils/news.ts';

export default function NewsPage() {
  usePageTitle('News');
  const { data, loading, error } = useCachedQuery<NewsFeed>('news', () => getNews() as Promise<NewsFeed>, []);
  const items = data?.items || [];

  return (
    <>
      <div className={`team-heading-row ${lbteam_classes.team_heading_row}`}>
        <h1 className={`mt-0 ${lbteam_classes.team_heading_title} ${utility_classes.mt_0}`}>MyPayIndia News</h1>
        <a href="https://mypayindia.com/news/premium" target="_blank" rel="noopener noreferrer" className={`btn secondary compact ${news_classes.premium_link}`}>
          Premium News <ExternalIcon size={11} />
        </a>
      </div>
      <p className={`mt-0 mb-0 ${utility_classes.mt_0}`}>This is where we announce the most recent additions to MyPayIndia and surrounding services!</p>

      {loading && !data ? (
        <div className={`card mb-2 ${card_classes.card} ${utility_classes.mb_2}`}>
          <Skeleton width={220} height={20} />
          <Skeleton width={120} height={13} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={70} style={{ marginTop: 14 }} />
        </div>
      ) : error ? (
        <ErrorBox error={error} />
      ) : items.length === 0 ? (
        <Empty>No news yet...</Empty>
      ) : (
        items.map((item) => (
          <div key={item.guid || item.link} className={`card mb-2 ${card_classes.card} ${utility_classes.mb_2}`}>
            <div className={`row spread ${utility_classes.spread} ${utility_classes.row}`} style={{ alignItems: 'baseline', gap: 8 }}>
              <Link to={`/i/news/${slugify(item.title)}`} className={`news-headline-link ${news_classes.headline_link}`}>
                <h2 className={news_classes.headline_title} style={{ margin: 0 }}>{item.title}</h2>
              </Link>
              {item.pubDate && <span className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{formatNewsDate(item.pubDate)}</span>}
            </div>
            <RichHtml className={`news-body ${news_classes.body}`} html={item.description} />
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className={`muted ${utility_classes.muted}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.8rem', marginTop: 4 }}>
                View on MyPayIndia.com <ExternalIcon size={12} />
              </a>
            )}
          </div>
        ))
      )}
    </>
  );
}
