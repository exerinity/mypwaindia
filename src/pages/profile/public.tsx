import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { get_public_profile } from '../../api/profile.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { Empty, ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { AgeTag } from '../../components/ui/age_tag.tsx';
import { ProfileUpdates } from '../../components/profile/updates.tsx';
import { ProfileShop } from '../../components/shop/storefront.tsx';
import { profile_path, safe_http_url, section_title } from '../../utils/profiles.ts';
import { formatINR } from '../../utils/money.js';

export default function ProfilesPage() {
  const { username } = useParams();
  const { active } = useAuth();
  if (username) return <PublicProfile key={`${username}:${active?.env}:${active?.token}`} username={username} />;
  return <ProfileSearch />;
}

function ProfileSearch() {
  usePageTitle('Profiles');
  const { active } = useAuth();
  const navigate = useNavigate();
  const [username, set_username] = useState('');
  return <>
    <h1 className="mt-0">Profiles</h1>
    <form className="card" style={{ maxWidth: 480 }} onSubmit={(event) => {
      event.preventDefault();
      const value = username.trim().replace(/^@/, '');
      if (value) navigate(profile_path(value));
    }}>
      <h3 className="mt-0">Find a profile</h3>
      <FloatingInput id="profile_search" label="Username" type="text" required value={username} onChange={(event) => set_username(event.target.value)} />
      <div className="btn-row mt-2">
        <button disabled={!username.trim().replace(/^@/, '')}>View profile</button>
        {active && <Link to={profile_path(active.username)} className="btn secondary">My profile</Link>}
      </div>
    </form>
  </>;
}

function PublicProfile({ username }: { username: string }) {
  usePageTitle(`@${username}`);
  const { active } = useAuth();
  const location = useLocation();
  const auth = active ? { token: active.token, env: active.env } : undefined;
  const owner = active?.username.toLowerCase() === username.toLowerCase();
  const resource = use_profile_resource(() => get_public_profile(username, auth), `${username}:${active?.env}:${active?.token}`);
  const dates_module = useLazyModule(() => import('../../utils/dates.js'));
  const profile = resource.data;
  const member_age = profile?.member_since ? dates_module?.calcAge(profile.member_since) : null;
  const report_link = !owner && active && <div className="btn-row">
    <Link className="btn secondary" to="/i/flow/reportprofile" state={{ username, account_id: active.id, account_env: active.env, backgroundLocation: location }}>Report profile</Link>
  </div>;

  return <>
    {resource.loading && <LoadingRow>Retrieving data...</LoadingRow>}
    <ErrorBox error={resource.error} />
    {!!resource.error && <div className="btn-row"><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {profile && (profile.private || profile.locked) ? <div className="card">
      <h1 className="mt-0">@{username}</h1>
      <Empty>{profile.locked ? 'This profile is unavailable' : 'This profile is private'}</Empty>
      {report_link}
    </div> : profile && <>
      <section className="card mb-2">
        {safe_http_url(profile.banner_url) && <img className="profile_banner" src={safe_http_url(profile.banner_url)} alt="Profile banner" />}
        {safe_http_url(profile.avatar_url) && <img className="profile_avatar" src={safe_http_url(profile.avatar_url)} alt={`@${username}'s avatar`} />}
        <h1 className="mt-1">@{profile.username ?? username}</h1>
        {profile.visibility === 'private' && <p className="muted">Only you can see this private profile</p>}
        {profile.bio && <p className="profile_prose">{profile.bio}</p>}
        {profile.balance_visible && profile.balance != null && <div className="stat-card mt-2"><span className="stat-label">Balance</span><span className="stat-value">{formatINR(profile.balance)}</span></div>}
        {profile.member_since && <div className="stat-sub mt-1">Member since {new Date(profile.member_since).toLocaleDateString()}{member_age && <> <AgeTag age={member_age} /></>}</div>}
        <div className="btn-row mt-2">
          {(profile.links ?? []).map((link, index) => {
            const url = safe_http_url(link.url);
            return url && <a key={index} href={url} className="btn secondary" target="_blank" rel="noopener noreferrer">{link.label ?? link.platform}</a>;
          })}
        </div>
        {report_link}
      </section>
      {(profile.sections ?? []).filter((section) => section.visible && (section.type === 'shop' || section.type === 'updates')).map((section, index) => <section className="card mb-2" key={`${section.type}:${index}`}>
        <h3 className="mt-0">{section.title || (typeof section.config?.title === 'string' ? section.config.title : section_title(section.type))}</h3>
        {section.type === 'updates' ? <ProfileUpdates username={username} auth={auth} owner={owner} />
          : <ProfileShop username={username} auth={auth} owner={owner} />}
      </section>)}
    </>}
  </>;
}
