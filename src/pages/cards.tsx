import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { Modal } from '../components/modal.tsx';
import { VisaIcon, MastercardIcon } from '../components/icons.tsx';

interface Card { number: string; name: string; exp: string; cvv: string; type: string; bg: string; network: 'visa' | 'mastercard' }

function pad(n: number, len: number) {
  return String(Math.abs(Math.round(n)) % Math.pow(10, len)).padStart(len, '0');
}

function buildCards(userId: number | string | undefined, holderName: string): Card[] {
  const n = Number(userId) || 0;
  const name = holderName.toUpperCase();
  return [
    {
      number: `4${pad(n + 532, 3)} ${pad(n * 3 + 1234, 4)} ${pad(n * 7 + 5678, 4)} ${pad(n * 11 + 9010, 4)}`,
      name,
      exp: `${pad((n % 12) + 1, 2)}/${27 + (n % 3)}`,
      cvv: pad((n * 31 + 284) % 900 + 100, 3),
      type: 'EVERYDAY',
      bg: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
      network: 'visa',
    },
    {
      number: `5425 ${pad(n * 5 + 2334, 4)} ${pad(n * 9 + 3010, 4)} ${pad(n * 13 + 9903, 4)}`,
      name,
      exp: `${pad((n + 2) % 12 + 1, 2)}/${28 + (n % 2)}`,
      cvv: pad((n * 47 + 731) % 900 + 100, 3),
      type: 'SAVINGS',
      bg: 'linear-gradient(135deg, #b71c1c 0%, #7f0000 100%)',
      network: 'mastercard',
    },
    {
      number: `4${pad(n * 17 + 522, 3)} ${pad(n * 23 + 7005, 4)} ${pad(n * 29 + 4321, 4)} ${pad(n * 37 + 8765, 4)}`,
      name,
      exp: `${pad((n + 4) % 12 + 1, 2)}/${26 + (n % 4)}`,
      cvv: pad((n * 53 + 891) % 900 + 100, 3),
      type: 'BUSINESS',
      bg: 'linear-gradient(135deg, #1b5e20 0%, #003300 100%)',
      network: 'visa',
    }
  ];
}


function CreditCard({ card }: { card: Card }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      style={{
        background: card.bg,
        borderRadius: 16,
        padding: '24px 28px',
        color: '#fff',
        position: 'relative',
        cursor: 'default',
        minHeight: 190,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      }}
      onMouseEnter={() => setRevealed(true)}
      onMouseLeave={() => setRevealed(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '0.65rem', opacity: 0.65, letterSpacing: 2, fontFamily: 'sans-serif' }}>
          MYPAYINDIA
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: 2, fontFamily: 'sans-serif', opacity: 0.9 }}>
            {card.type}
          </span>
          {card.network === 'visa' ? <VisaIcon /> : <MastercardIcon />}
        </div>
      </div>

      <div style={{
        fontFamily: 'monospace',
        fontSize: '1.2rem',
        letterSpacing: '0.2em',
        filter: revealed ? 'none' : 'blur(7px)',
        transition: 'filter 0.25s',
        margin: '12px 0',
      }}>
        {card.number}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.55rem', opacity: 0.55, letterSpacing: 2, fontFamily: 'sans-serif', marginBottom: 3 }}>CARD HOLDER</div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            letterSpacing: '0.1em',
            filter: revealed ? 'none' : 'blur(5px)',
            transition: 'filter 0.25s',
          }}>
            {card.name}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', opacity: 0.55, letterSpacing: 2, fontFamily: 'sans-serif', marginBottom: 3 }}>EXPIRES</div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            filter: revealed ? 'none' : 'blur(5px)',
            transition: 'filter 0.25s',
          }}>
            {card.exp}
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.55rem', opacity: 0.55, letterSpacing: 2, fontFamily: 'sans-serif', marginBottom: 3 }}>CVV</div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            filter: revealed ? 'none' : 'blur(5px)',
            transition: 'filter 0.25s',
          }}>
            {card.cvv}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  usePageTitle('Cards');
  const { active } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const holderName = [active?.firstName, active?.lastName].filter(Boolean).join(' ') || active?.username || '';
  const cards = buildCards(active?.id, holderName);

  return (
    <>
      <Modal open={!settings.scambait} onClose={() => navigate(-1)} title="No" fullscreen>
        <div className="center">
          You are not using scambait mode and are not permitted to perform this action
        </div>
      </Modal>
      <h1 className="mt-0">Cards</h1>
      <div className="grid cols-2">
        {cards.map((card) => (
          <CreditCard key={card.type} card={card} />
        ))}
      </div>
    </>
  );
}
