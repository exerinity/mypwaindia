import { useEffect, useState } from 'react';
import type { Profile, ProfileAccent, ProfileStatus } from '../../api/profile.js';
import { avatar_accessories, pride_flags, profile_accents } from '../../api/profile.js';
import { HoverTip, PrideFlagTag } from '../data/team_member_card.tsx';
import { SuccessIcon } from '../ui/icons.tsx';
import { safe_http_url } from '../../utils/profiles.ts';
import { darken, isLight } from '../../utils/colors.js';

const accents = { rose: '#e11d48', amber: '#f59e0b', green: '#22c55e', teal: '#14b8a6', blue: '#3b82f6', violet: '#8b5cf6', slate: '#94a3b8' };
const accessories = { cat_ears_black: '#242424', cat_ears_white: '#f5f5f5', cat_ears_orange: '#e99b45', cat_ears_gray: '#888888' };

export function profile_accent_style(accent?: ProfileAccent | null): React.CSSProperties | undefined {
  if (!accent || accent === 'brand' || !profile_accents.includes(accent)) return;
  const color = accents[accent];
  return { '--brand': color, '--brand-dark': darken(color, 0.15), '--brand-text': isLight(color) ? '#000' : '#fff' } as React.CSSProperties;
}

export function ProfileIdentity({ profile, username }: { profile: Profile; username: string }) {
  const avatar_url = safe_http_url(profile.avatar_url);
  const banner_url = safe_http_url(profile.banner_url);
  const avatar_flag = pride_flags.find((flag) => flag === profile.avatar_flag);
  const accessory = avatar_accessories.find((value) => value === profile.avatar_accessory);
  const country = profile.country?.toUpperCase();
  const country_flag = country === 'GB-SCT' ? '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}'
    : country && /^[A-Z]{2}$/.test(country) ? String.fromCodePoint(...Array.from(country, (letter) => letter.charCodeAt(0) + 127397)) : '';
  return <>
    {banner_url && <img className="profile_banner" src={banner_url} alt="Profile banner" />}
    {avatar_url && <div className="profile_avatar_frame">
      {accessory && <svg className="profile_avatar_accessory" viewBox="0 0 100 100" aria-label={accessory.replace(/_/g, ' ')} role="img"
        style={{ '--ear-fur': accessories[accessory], '--ear-inner': '#e8a3b8' } as React.CSSProperties}>
        <path d="M4 40 L14 3 Q16 -1 19 2 L46 28 Z" fill="var(--ear-fur)" />
        <path d="M13 34 L18 13 L34 29 Z" fill="var(--ear-inner)" />
        <path d="M96 40 L86 3 Q84 -1 81 2 L54 28 Z" fill="var(--ear-fur)" />
        <path d="M87 34 L82 13 L66 29 Z" fill="var(--ear-inner)" />
      </svg>}
      {avatar_flag && <span className={`pride-flag pride-flag--${avatar_flag} profile_avatar_flag`} aria-hidden="true" />}
      <img className="profile_avatar" src={avatar_url} alt={`@${username}'s avatar`} style={avatar_flag ? { padding: 6 } : undefined} />
    </div>}
    <div className="row mt-1">
      <h1 className="mt-0" style={{ marginBottom: 0 }}>@{profile.username ?? username}</h1>
      {profile.verified && <HoverTip tip="Verified"><span role="img" aria-label="Verified"><SuccessIcon size={24} /></span></HoverTip>}
      {(profile.pride_flags ?? []).filter((flag) => pride_flags.includes(flag)).map((flag) => <PrideFlagTag key={flag} flag={flag} />)}
      {country_flag && <HoverTip tip={profile.country_name ?? country ?? ''}><span role="img" aria-label={profile.country_name ?? country ?? ''}>{country_flag}</span></HoverTip>}
    </div>
    {profile.pronouns && <p className="muted mt-1">{profile.pronouns}</p>}
    {!!profile.badges?.length && <div className="row mt-2">{profile.badges.map((badge) => <span className="pill" key={badge}>{badge}</span>)}</div>}
    {profile.status && <ProfileStatusLine status={profile.status} />}
  </>;
}

function ProfileStatusLine({ status }: { status: ProfileStatus }) {
  const [now, set_now] = useState(Date.now());
  const expires_at = status.expires_at ? Date.parse(status.expires_at) : null;
  useEffect(() => {
    set_now(Date.now());
    if (expires_at === null || !Number.isFinite(expires_at)) return;
    const timer = window.setTimeout(() => set_now(Date.now()), Math.min(2147483647, Math.max(0, expires_at - Date.now())));
    return () => window.clearTimeout(timer);
  }, [expires_at]);
  if (expires_at !== null && (!Number.isFinite(expires_at) || expires_at <= now)) return null;
  return <div className="row mt-2 mb-2">
    <span className="pill">
      <span className="profile_prose">{status.emoji}{status.emoji && status.text ? ' ' : ''}{status.text}</span>
    </span>
  </div>;
}
