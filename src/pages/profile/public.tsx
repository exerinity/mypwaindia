import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { block_profile, follow_profile, get_public_profile } from '../../api/profile.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { Empty, ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { ProfileUpdates } from '../../components/profile/updates.tsx';
import { ProfileIdentity, profile_accent_style } from '../../components/profile/identity.tsx';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { ProfileShop } from '../../components/shop/storefront.tsx';
import { profile_path, safe_http_url, section_title } from '../../utils/profiles.ts';

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
    <h1 className={`mt-0 ${utility_classes.mt_0}`}>Profiles</h1>
    <form className={`card ${card_classes.card}`} style={{ maxWidth: 480 }} onSubmit={(event) => {
      event.preventDefault();
      const value = username.trim().replace(/^@/, '');
      if (value) navigate(profile_path(value));
    }}>
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>Find a profile</h3>
      <FloatingInput id="profile_search" label="Username" type="text" required value={username} onChange={(event) => set_username(event.target.value)} />
      <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>
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
  const [following, set_following] = useState<boolean | null>(null);
  const [blocked, set_blocked] = useState<boolean | null>(null);
  const [followers, set_followers] = useState<number | null>(null);
  const [busy, set_busy] = useState(false);
  const [action_error, set_action_error] = useState<unknown>(null);
  const [confirm_block, set_confirm_block] = useState(false);
  const dates_module = useLazyModule(() => import('../../utils/dates.js'));
  const profile = resource.data;
  const is_following = following ?? profile?.following;
  const is_blocked = blocked ?? profile?.blocked;
  useEffect(() => {
    function refresh_profile() { resource.reload(); }
    window.addEventListener('profile_donated', refresh_profile);
    return () => window.removeEventListener('profile_donated', refresh_profile);
  }, [resource.reload]);
  async function toggle_relationship(action: 'follow' | 'block') {
    if (!auth || owner || busy) return;
    set_confirm_block(false);
    set_busy(true);
    set_action_error(null);
    try {
      if (action === 'follow') {
        const result = await follow_profile(auth, username);
        set_following(result.following);
        set_followers(result.followers);
      } else {
        const result = await block_profile(auth, username);
        set_blocked(result.blocked);
        if (result.blocked) { set_following(false); set_followers(null); resource.reload(); }
      }
    } catch (error) { set_action_error(error); }
    finally { set_busy(false); }
  }
  const member_age = profile?.member_since ? dates_module?.calcAge(profile.member_since) : null;
  const edit_link = owner && <Link className="btn secondary" to="/account/profile">Edit profile</Link>;
  const report_link = !owner && active && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
    <Link className="btn secondary" to="/i/flow/reportprofile" state={{ username, account_id: active.id, account_env: active.env, backgroundLocation: location }}>Report profile</Link>
  </div>;

  return <>
    {resource.loading && <LoadingRow>Retrieving data...</LoadingRow>}
    <ErrorBox error={resource.error} />
    {!!resource.error && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {profile && (profile.private || profile.locked) ? <div className={`card ${card_classes.card}`}>
      <h1 className={`mt-0 ${utility_classes.mt_0}`}>@{username}</h1>
      <Empty>{profile.locked ? 'This profile is unavailable' : 'This profile is private'}</Empty>
      {edit_link && <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>{edit_link}</div>}
      {report_link}
    </div> : profile && <>
      <div style={profile_accent_style(profile.accent)}>
      <section className={`card mb-2 ${card_classes.card} ${utility_classes.mb_2}`}>
        <ProfileIdentity profile={profile} username={username} followers={followers} member_age={member_age} />
        {profile.visibility === 'private' && <div className={`${stat_classes.sub} mt-2 ${utility_classes.mt_2}`}>Only you can see this private profile</div>}
        {profile.bio && <div className={`mt-2 ${utility_classes.mt_2}`}><p className={`profile_prose ${profile_classes.prose}`}>{profile.bio}</p></div>}
        <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>
          {edit_link}
          {(profile.links ?? []).map((link, index) => {
            const url = safe_http_url(link.url);
            return url && <a key={index} href={url} className="btn secondary" target="_blank" rel="noopener noreferrer">{link.label ?? link.platform}</a>;
          })}
        </div>
        {report_link}
        <ErrorBox error={action_error} />
        {!owner && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
          {active ? <>
            <button className="secondary" disabled={busy || is_blocked === true} onClick={() => toggle_relationship('follow')}>{is_following == null ? 'Follow / unfollow' : is_following ? 'Unfollow' : 'Follow'}</button>
            <button className="secondary" disabled={busy} onClick={() => set_confirm_block(true)}>{is_blocked == null ? 'Block / unblock' : is_blocked ? 'Unblock' : 'Block'}</button>
            <Link className="btn" to="/i/flow/donateprofile" state={{ username, account_id: active.id, account_env: active.env, backgroundLocation: location }}>Donate</Link>
          </> : <Link className="btn secondary" to="/i/flow/login" state={{ from: location }}>Sign in to follow or donate</Link>}
        </div>}
      </section>
      {(profile.sections ?? []).filter((section) => section.visible && (section.type === 'shop' || section.type === 'updates')).map((section, index) => <section className={`card mb-2 ${card_classes.card} ${utility_classes.mb_2}`} key={`${section.type}:${index}`}>
        <h3 className={`mt-0 ${utility_classes.mt_0}`}>{section.title || (typeof section.config?.title === 'string' ? section.config.title : section_title(section.type))}</h3>
        {section.type === 'updates' ? <ProfileUpdates username={username} auth={auth} owner={owner} />
          : <ProfileShop username={username} auth={auth} owner={owner} />}
      </section>)}
      </div>
    </>}
    <ConfirmModal open={confirm_block} onClose={() => set_confirm_block(false)} onConfirm={() => toggle_relationship('block')}
      title={is_blocked === true ? 'Unblock profile' : is_blocked === false ? 'Block profile' : 'Toggle blocking'}
      confirmLabel={is_blocked === true ? 'Unblock' : is_blocked === false ? 'Block' : 'Toggle blocking'}
      message={is_blocked === true ? `Allow @${username} to follow you, buy from your shop, and receive your gifts again?` : `Toggle blocking for @${username}? Blocking removes follows in both directions and prevents them from following you, buying from your shop, or receiving your gifts.`} />
  </>;
}
