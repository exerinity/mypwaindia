import { useState } from 'react';
import { useApiCall } from '../hooks/useApiCall.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { getTeam } from '../api/info.js';
import { formatDateShort, calcAge } from '../utils/dates.js';
import { LoadingRow, ErrorBox, Empty } from '../components/Status.jsx';
import { ExternalIcon } from '../components/Icons.jsx';

function AgeTag({ age }) {
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

export default function TeamPage() {
  usePageTitle('Meet the team');
  const { data, loading, error } = useApiCall(() => getTeam(), []);
  const team = data?.team || [];

  return (
    <>
      <h1 className="mt-0">Meet the team</h1>
      <p className="muted mb-2">Get to know the people behind MyPayIndia, the future of online banking!</p>
      <p>Currently our team consists of {team.length} people</p>

      {loading && !data ? <LoadingRow /> :
       error ? <ErrorBox error={error} /> :
       team.length === 0 ? <Empty>N</Empty> :
       <div className="grid cols-3">
        {team.map((m) => (
          <div key={m.name} className="card team-card">
            <img
              className="team-avatar"
              src={m.avatar}
              alt={m.name}
              onError={(e) => { e.currentTarget.style.opacity = 0.4; }}
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
        ))}
       </div>
      }
    </>
  );
}
