import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { GAMES } from './iotm_game.tsx';
import { WarningIcon } from '../components/icons.tsx';

export default function IotmPage() {
  usePageTitle('Investment Opportunities™');

  return (
    <>
      <h1 className="mt-0">Investment Opportunities™</h1>
      <p style={{ marginBottom: 16 }}>
        You may have at some point when using our service asked yourself "How the hell do I make money in this thing??". Here you can pick out multiple ways to earn money using our top of the line Investment Opportunities™ system. Enjoy!
      </p>

      <div className="card compact" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        {GAMES.map((game, i) => (
          <Link
            key={game.id}
            to={`/i/invest/${game.id}`}
            style={{
              display: 'block',
              padding: '14px 18px',
              textDecoration: 'none',
              color: 'var(--fg)',
              borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              fontWeight: 500,
            }}
          >
            {game.name}
          </Link>
        ))}
      </div>
      <div className="alert alert-warning" style={{ marginBottom: 16 }}>
        <WarningIcon /> These will probably not work. If true, <a href="https://mypayindia.com/accountservices/iotm/" target="_blank" rel="noopener">go to the main website</a>.
      </div>
    </>
  );
}
