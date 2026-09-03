import { useState } from 'react';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { ExternalIcon } from '../ui/icons.tsx';
import { getSocialSiteLabel, resolveSocialSite, SocialIcon } from '../ui/social_icons.tsx';

const ASSET_HOST = 'https://mypayindia.com';
export function avatarConductor(avatar?: string): string {
  if (!avatar) return '';
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith('//')) return `https:${avatar}`;
  return `${ASSET_HOST}/${avatar.replace(/^\/+/, '')}`;
}

export interface Age { years: number; months: number; weeks: number; days: number }
export interface RoleHistoryEntry { role: string; start_date: string; end_date: string }
export interface TeamMember {
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

export function HoverTip({ tip, children }: { tip: string; children: React.ReactNode }) {
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

export function PrideFlagTag({ flag }: { flag: string }) {
  const tip = PRIDE_FLAG_TIP_OVERRIDES[flag.toLowerCase()] ?? flag;
  return (
    <HoverTip tip={tip}>
      <span className={`pride-flag pride-flag--${flag.toLowerCase()}`} style={{ cursor: 'help' }} />
    </HoverTip>
  );
}

export function AgeTag({ age }: { age: Age }) {
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

export function formatJoinDate(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString(undefined, { month: 'long' })} ${ordinal(d.getDate())}, ${d.getFullYear()}`;
}

export function formatMonthYear(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export function TeamMemberCard({
  m,
  onAvatarClick,
  twitterAsX = false,
}: {
  m: TeamMember;
  onAvatarClick?: (m: TeamMember) => void;
  twitterAsX?: boolean;
}) {
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const calcAge = (d: string) => datesMod ? datesMod.calcAge(d) : null;

  return (
    <>
      <div className="team-header">
        <img
          className="team-avatar"
          src={avatarConductor(m.avatar)}
          alt={m.name}
          width={72}
          height={72}
          onClick={() => onAvatarClick?.(m)}
          style={onAvatarClick ? undefined : { cursor: 'default' }}
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
          {m.role && m.role !== '-' && <div className="team-role">{m.role}</div>}
          {m.status !== 'special_thanks' && (
            <div className="team-joined">
              joined {formatJoinDate(m.joined)}
              {m.joined && (() => { const a = calcAge(m.joined); return a ? <> <AgeTag age={a} /></> : null; })()}
            </div>
          )}
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
        <div className="team-socials" role="group" aria-label={`${m.name}'s links`}>
          {Object.entries(m.socials).map(([key, url]) => {
            const site = resolveSocialSite(key, url);
            const label = site ? getSocialSiteLabel(site) : key;

            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn secondary compact${site ? ' team-social-link' : ''}`}
                aria-label={`Open ${label} for ${m.name}`}
                title={label}
              >
                {site ? <SocialIcon site={site} twitterAsX={twitterAsX} /> : <>{key} <ExternalIcon size={11} /></>}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
