import { Link } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { ExternalIcon, ChevronRight } from '../../components/ui/icons.tsx';

const SKILL_GAMES = [
  { label: 'Intelligence Identifier', href: 'https://mypayindia.com/iotm/intelligenceid' },
  { label: 'Minesweeper', href: 'https://mypayindia.com/iotm/minesweeper' },
  { label: 'Wordle', href: 'https://mypayindia.com/iotm/wordle' },
  { label: 'Button', to: '/iotm/button' },
];

const LUCK_GAMES = [
  { label: 'Coinflip', href: 'https://mypayindia.com/iotm/coinflip' },
  { label: 'Slots', href: 'https://mypayindia.com/iotm/slots' },
  { label: 'Mines', href: 'https://mypayindia.com/iotm/mines' },
  { label: 'Roulette', href: 'https://mypayindia.com/iotm/roulette' },
];

type GameEntry = { label: string; href: string; to?: never } | { label: string; to: string; href?: never };

function GameList({ games }: { games: GameEntry[] }) {
  return (
    <div className="btn-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
      {games.map((game) => game.to ? (
        <Link key={game.to} to={game.to} className="btn secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>{game.label}<ChevronRight /></Link>
      ) : (
        <a key={game.href} href={game.href} target="_blank" rel="noopener noreferrer" className="btn secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {game.label}
          <ExternalIcon />
        </a>
      ))}
    </div>
  );
}

export default function InvestPage() {
  usePageTitle('Investment Opportunities™');

  return (
    <>
      <h1 className="mt-0">MyPayIndia Investment Opportunities™</h1>
      <p className="mt-0 mb-0">You may have at some point when using our service asked yourself "How the hell do I make money in this thing??". Here you can pick out multiple ways to earn money using our top of the line Investment Opportunities™ system. Enjoy!</p>

      <div className="card mb-2">
        <h3 style={{ margin: '0 0 12px' }}>Skill-based Investments</h3>
        <GameList games={SKILL_GAMES} />
      </div>

      <div className="card">
        <h3 style={{ margin: '0 0 12px' }}>Luck-based Investments</h3>
        <GameList games={LUCK_GAMES} />
      </div>
    </>
  );
}
