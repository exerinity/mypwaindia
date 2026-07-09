import { useState } from 'react';
import { useCachedQuery } from '../hooks/cached_query.js';
import { usePageTitle } from '../hooks/page_title.js';
import { getTeam } from '../api/flow.js';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { Skeleton, ErrorBox, Empty } from '../components/status.tsx';
import { ExternalIcon } from '../components/icons.tsx';
import { Modal } from '../components/modal.tsx';

interface Age { years: number; months: number; weeks: number; days: number }
interface RoleHistoryEntry { role: string; start_date: string; end_date: string }
interface TeamMember {
  name: string;
  role: string;
  avatar: string;
  joined: string;
  socials?: Record<string, string>;
  status?: string;
  country?: string;
  country_name?: string;
  country_flag?: string;
  role_history?: RoleHistoryEntry[];
  contributions?: string[];
  quote?: string | null;
  pride_flags?: string[];
}

function HoverTip({ tip, children }: { tip: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
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
          {tip}
        </span>
      )}
    </span>
  );
}

const PRIDE_FLAG_TIP_OVERRIDES: Record<string, string> = {
  mlm: 'gay',
  progress: 'progressive',
  trans: 'transgender',
};

function PrideFlagTag({ flag }: { flag: string }) {
  const tip = PRIDE_FLAG_TIP_OVERRIDES[flag.toLowerCase()] ?? flag;
  return (
    <HoverTip tip={tip}>
      <span className={`pride-flag pride-flag--${flag.toLowerCase()}`} style={{ cursor: 'help' }} />
    </HoverTip>
  );
}

function AgeTag({ age }: { age: Age }) {
  return (
    <HoverTip tip={`${age.years} years, ${age.months} months, ${age.weeks} weeks, ${age.days} days`}>
      <span style={{ color: 'var(--muted)', fontSize: '0.85em', cursor: 'help' }}>
        ({age.years > 0 ? `${age.years}y` : age.months > 0 ? `${age.months}mo` : age.weeks > 0 ? `${age.weeks}w` : `${age.days}d`})
      </span>
    </HoverTip>
  );
}

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatJoinDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString(undefined, { month: 'long' })} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export default function TeamPage() {
  usePageTitle('Meet the team');
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { data, loading, error } = useCachedQuery<{ team: TeamMember[] }>('team', () => getTeam() as Promise<{ team: TeamMember[] }>, []);
  const team = data?.team || [];
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const calcAge = (d: string) => datesMod ? datesMod.calcAge(d) : null;

  return (
    <>
      <Modal className="slide" open={!!selectedMember} onClose={() => setSelectedMember(null)} title={selectedMember?.name ?? ''}>
        {selectedMember && (
          <a href={selectedMember.avatar} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
            <img
              src={selectedMember.avatar}
              alt={selectedMember.name}
              style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }}
            />
          </a>
        )}
      </Modal>
      <h1 className="mt-0">Meet the team</h1>
      <p className="mt-0 mb-0">Get to know the people behind MyPayIndia, the future of online banking!</p>
      <p className="mt-0 mb-0 muted"><i>Currently our team consists of <strong>{team.length || (
        <span className="skeleton" style={{ display: 'inline-block', width: 24, height: '1.2em', borderRadius: 3, verticalAlign: 'middle' }} />
      )}</strong> people:</i></p>

      {loading && !data ? (
        <div className="grid cols-team">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card team-card">
              <div className="team-header">
                <Skeleton width={72} height={72} radius={50} />
                <div className="team-header-info">
                  <Skeleton width={110} height={16} />
                  <Skeleton width={80} height={13} style={{ marginTop: 6 }} />
                </div>
              </div>
              <Skeleton width={160} height={11} style={{ marginTop: 10 }} />
            </div>
          ))}
        </div>
      ) :
       error ? <ErrorBox error={error} /> :
       team.length === 0 ? <Empty>N</Empty> :
       <div className="grid cols-team">
        {team.map((m) => (
            <div key={m.name} className="card team-card">
              <div className="team-header">
                <img
                  className="team-avatar"
                  src={m.avatar}
                  alt={m.name}
                  width={72}
                  height={72}
                  onClick={() => setSelectedMember(m)}
                  onError={(e) => { e.currentTarget.style.opacity = '0.4'; }}
                />
                <div className="team-header-info">
                  <div className="team-name">
                    <span>{m.name}</span>
                    {m.country_flag && (
                      <HoverTip tip={m.country_name ?? ''}>
                        <span style={{ cursor: 'help' }}>{m.country_flag}</span>
                      </HoverTip>
                    )}
                    {m.pride_flags?.map((f) => <PrideFlagTag key={f} flag={f} />)}
                  </div>
                  <div className="team-role">{m.role}</div>
                  <div className="team-joined">
                    joined {formatJoinDate(m.joined)}
                    {m.joined && (() => { const a = calcAge(m.joined); return a ? <> <AgeTag age={a} /></> : null; })()}
                  </div>
                </div>
              </div>
              {m.quote && <p className="team-quote">"{m.quote}"</p>}
              {!!m.role_history?.length && (
                <>
                  <div className="team-section-label">Role history</div>
                  <input type="checkbox" id={`roles-${m.name}`} className="roles-toggle" />
                  <ul className="team-timeline">
                    {m.role_history.map((h, i) => (
                      <li key={i} className="timeline-item">
                        <div className="timeline-heading">{h.role}</div>
                        <div className="timeline-date">
                          {formatMonthYear(h.start_date)} - {h.end_date ? formatMonthYear(h.end_date) : 'Present'}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {m.role_history.length > 2 && (
                    <label htmlFor={`roles-${m.name}`} className="roles-toggle-label">
                      <span className="more-text">...more?</span>
                      <span className="less-text">...less?</span>
                    </label>
                  )}
                </>
              )}
              {!!m.contributions?.length && (
                <>
                  <div className="team-section-label">Notable contributions</div>
                  <ul className="team-contributions">
                    {m.contributions.map((c) => <li key={c}>{c}</li>)}
                  </ul>
                </>
              )}
              {m.socials && Object.keys(m.socials).length > 0 && (
                <div className="team-socials">
                  {Object.entries(m.socials).map(([key, url]) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="btn secondary compact">
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
