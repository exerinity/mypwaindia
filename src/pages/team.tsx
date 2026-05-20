import { useState } from 'react';
import { useApiCall } from '../hooks/api_call.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getTeam } from '../api/info.js';
import { formatDateShort, calcAge } from '../utils/dates.js';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { ExternalIcon } from '../components/icons.tsx';

interface Age { years: number; months: number; weeks: number; days: number }
interface TeamMember { name: string; role: string; avatar: string; joined: string; socials?: Record<string, string> }

function AgeTag({ age }: { age: Age }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ color: 'var(--muted)', fontSize: '0.85em', cursor: 'help' }}>
        ({age.years > 0 ? `${age.years}y` : age.months > 0 ? `${age.months}mo` : age.weeks > 0 ? `${age.weeks}w` : `${age.days}d`})
      </span>
      {hovered && (
        <span style={{
          position: 'absolute',
          bottom: 'calc(100% + 6px)',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-2, #222)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '5px 10px',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {age.years} years, {age.months} months, {age.weeks} weeks, {age.days} days
        </span>
      )}
    </span>
  );
}

const ANIMS = [
  { name: 'card-crash',           duration: '0.55s', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  { name: 'card-spin-land',       duration: '0.7s',  easing: 'cubic-bezier(0.15, 0.85, 0.4, 1)' },
  { name: 'card-static',          duration: '0.2s',  easing: 'ease-out' },
  { name: 'card-flip',            duration: '0.5s',  easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
  { name: 'card-slide-far-right', duration: '0.45s', easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
];

export default function TeamPage() {
  usePageTitle('Meet the team');
  const { data, loading, error } = useApiCall<{ team: TeamMember[] }>(() => getTeam() as Promise<{ team: TeamMember[] }>, []);
  const team = data?.team || [];
  const [animOrder, setAnimOrder] = useState<number[]>([]);
  const [shuffleKey, setShuffleKey] = useState(0);

  function shuffle() {
    setAnimOrder(team.map(() => Math.floor(Math.random() * ANIMS.length)));
    setShuffleKey(k => k + 1);
  }

  return (
    <>
      <h1 className="mt-0">Meet the team</h1>
      <p className="muted mb-2">Get to know the people behind MyPayIndia, the future of online banking!</p>
      <p>Currently our team consists of {team.length || (
        <span className="skeleton" style={{ display: 'inline-block', width: 24, height: '1.2em', borderRadius: 3, verticalAlign: 'middle' }} />
      )} people</p>
      <button className="ghost" style={{ fontSize: '0.85rem', padding: '2px 6px', marginBottom: '20px', display: 'inline-block' }} onClick={shuffle}>reshuffle animations?</button>

      {loading && !data ? (
        <div className="grid cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card team-card">
              <Skeleton width={96} height={96} radius={50} />
              <Skeleton width={130} height={16} style={{ marginTop: 4 }} />
              <Skeleton width={80} height={13} />
              <Skeleton width={100} height={11} />
            </div>
          ))}
        </div>
      ) :
       error ? <ErrorBox error={error} /> :
       team.length === 0 ? <Empty>N</Empty> :
       <div className="grid cols-3">
        {team.map((m, i) => {
          const a = ANIMS[animOrder[i] ?? i % ANIMS.length];
          return (
            <div key={`${m.name}-${shuffleKey}`} className="card team-card" style={{
              animation: `${a.name} ${a.duration} ${a.easing} both`,
              animationDelay: `${i * 80}ms`,
            } as React.CSSProperties}>
              <img
                className="team-avatar"
                src={m.avatar}
                alt={m.name}
                onError={(e) => { e.currentTarget.style.opacity = '0.4'; }}
              />
              <div className="team-name">{m.name}</div>
              <div className="team-role">{m.role}</div>
              <div className="muted" style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                joined {formatDateShort(m.joined)}
                {m.joined && (() => { const a = calcAge(m.joined); return a ? <AgeTag age={a} /> : null; })()}
              </div>
              {m.socials && Object.keys(m.socials).length > 0 && (
                <div className="team-socials">
                  {Object.entries(m.socials).map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer">
                      {key} <ExternalIcon size={11} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
       </div>
      }
    </>
  );
}
