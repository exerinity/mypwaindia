import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { block_profile, discover_profiles, follow_profile, get_public_profile, pride_flags } from '../../api/profile.js';
import type { DiscoverProfile } from '../../api/profile.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { Empty, ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { ProfileUpdates } from '../../components/profile/updates.tsx';
import { ProfileIdentity, profile_accent_style } from '../../components/profile/identity.tsx';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { ProfileShop } from '../../components/shop/storefront.tsx';
import { HoverTip, PrideFlagTag } from '../../components/data/team_member_card.tsx';
import { country_flag_emoji, profile_path, safe_http_url, section_title } from '../../utils/profiles.ts';
import { SearchIcon, StoreIcon, UserIcon, VerifiedIcon } from '../../components/ui/icons.tsx';

export function PublicProfilePage() {
  const { username } = useParams();
  const { active } = useAuth();
  return username ? <PublicProfile key={`${username}:${active?.env}:${active?.token}`} username={username} /> : null;
}

export function DiscoverProfilesPage() {
  usePageTitle('Discover profiles');
  const { active } = useAuth();
  const auth = active ? { token: active.token, env: active.env } : undefined;
  const [search, set_search] = useState('');
  const [query, set_query] = useState('');
  const [tab, set_tab] = useState<'everyone' | 'following' | 'verified'>('everyone');
  const [page, set_page] = useState(1);
  const resource = use_profile_resource(() => discover_profiles(auth, { q: query, verified: tab === 'verified', following: tab === 'following', page }), `${active?.env}:${active?.token}:${query}:${tab}:${page}`);
  return <>
    <h1 className={`mt-0 ${utility_classes.mt_0}`}>Discover profiles</h1>
    <nav className={profile_classes.discover_tabs} aria-label="Discover profiles">
      {(['everyone', ...(active ? ['following'] : []), 'verified'] as Array<'everyone' | 'following' | 'verified'>).map((value) => <button key={value} className={tab === value ? profile_classes.discover_tab_active : profile_classes.discover_tab} aria-current={tab === value ? 'page' : undefined} onClick={() => { set_tab(value); set_page(1); }}>
        {value === 'everyone' ? 'Everyone' : value === 'following' ? 'Following' : 'Verified'}
      </button>)}
    </nav>
    <form className={profile_classes.discover_search} onSubmit={(event) => { event.preventDefault(); set_query(search.trim()); set_page(1); }}>
      <div className={profile_classes.discover_search_field}><FloatingInput id="profile_search" label="Username" leading={<SearchIcon />} compact type="search" className={profile_classes.discover_search_input} value={search} onChange={(event) => set_search(event.target.value)} /></div>
      <button className={profile_classes.discover_search_button}><SearchIcon />Search</button>
    </form>
    <ErrorBox error={resource.error} />
    {resource.loading && <LoadingRow />}
    {resource.data?.profiles.length === 0 && <Empty>No profiles found</Empty>}
    <div className={profile_classes.discover_grid}>
      {resource.data?.profiles.map((profile) => <DiscoverProfileCard key={profile.username} profile={profile} />)}
    </div>
    {resource.data && <div className={`row mt-2 ${utility_classes.row} ${utility_classes.mt_2}`}><button className="secondary" disabled={resource.loading || page <= 1} onClick={() => set_page(page - 1)}>Previous</button><span className={stat_classes.sub}>Page {resource.data.page} of {Math.max(1, resource.data.last_page)}</span><button className="secondary" disabled={resource.loading || page >= resource.data.last_page} onClick={() => set_page(page + 1)}>Next</button></div>}
  </>;
}

function DiscoverProfileCard({ profile }: { profile: DiscoverProfile }) {
  const avatar_url = safe_http_url(profile.avatar_url);
  const avatar_flag = profile.avatar_flag;
  const flag_values = [...(profile.pride_flags ?? [])];
  if (avatar_flag && pride_flags.includes(avatar_flag)) flag_values.push(avatar_flag);
  const flags = [...new Set(flag_values)];
  const country = profile.country;
  const country_flag = profile.country_flag || country_flag_emoji(country);
  const country_label = profile.country_name || country || 'Country';
  return <article className={`card ${card_classes.card} ${profile_classes.discover_card}`}>
    <div className={profile_classes.discover_card_header}>
      {avatar_url && <img className={profile_classes.discover_card_avatar} src={avatar_url} alt={`@${profile.username}'s avatar`} loading="lazy" />}
      <div className={profile_classes.discover_card_content}>
        <div className={profile_classes.discover_card_name}><Link to={profile_path(profile.username)}>@{profile.username}</Link>{profile.verified && <VerifiedIcon size={18} />}</div>
        {(profile.pronouns || flags.length > 0 || country_flag) && <div className={profile_classes.discover_card_identity}>
          {profile.pronouns && <span>{profile.pronouns}</span>}
          {flags.map((flag) => <PrideFlagTag key={flag} flag={flag} />)}
          {country_flag && <HoverTip tip={country_label}><span role="img" aria-label={country_label} style={{ cursor: 'help' }}>{country_flag}</span></HoverTip>}
        </div>}
        {profile.status && <div className={profile_classes.discover_card_status}>{profile.status.emoji}{profile.status.emoji && profile.status.text ? ' ' : ''}{profile.status.text}</div>}
        {profile.bio && <div className={`profile_prose ${profile_classes.discover_card_bio} ${profile_classes.prose}`}>{profile.bio}</div>}
        <div className={profile_classes.discover_card_meta}>
          <span className={profile_classes.discover_card_meta_item}><UserIcon size={14} />{profile.followers} {profile.followers === 1 ? 'follower' : 'followers'}</span>
          <span className={profile_classes.discover_card_meta_item}><StoreIcon size={14} />{profile.listed_items} {profile.listed_items === 1 ? 'item for sale' : 'items for sale'}</span>
        </div>
      </div>
    </div>
  </article>;
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
  const [selected_avatar, set_selected_avatar] = useState<string | null>(null);
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
    <Modal className="slide" open={!!selected_avatar} onClose={() => set_selected_avatar(null)} title={`@${username}`}>
      {selected_avatar && <a href={selected_avatar} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
        <img src={selected_avatar} alt={`@${username}'s avatar`} style={{ maxWidth: '100%', borderRadius: 8, display: 'block', margin: '0 auto' }} />
      </a>}
    </Modal>
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
        <ProfileIdentity profile={profile} username={username} followers={followers} member_age={member_age} on_avatar_click={set_selected_avatar} />
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
        <div className={`row ${utility_classes.row} ${utility_classes.spread} ${utility_classes.mb_2}`}>
          <h3 className={`mt-0 ${utility_classes.mt_0}`}>{section.title || (typeof section.config?.title === 'string' ? section.config.title : section_title(section.type))}</h3>
          {section.type === 'shop' && <div className={`row ${utility_classes.row} ${utility_classes.gap_md}`}>
            {owner && <Link className="btn secondary" to="/account/shop">Manage shop</Link>}
            <Link className="btn secondary" to={`/i/profile/${encodeURIComponent(username)}/shop`}>View storefront</Link>
          </div>}
        </div>
        {section.type === 'updates' ? <ProfileUpdates username={username} auth={auth} owner={owner} />
          : <ProfileShop username={username} auth={auth} owner={owner} show_manage_link={false} />}
      </section>)}
      </div>
    </>}
    <ConfirmModal open={confirm_block} onClose={() => set_confirm_block(false)} onConfirm={() => toggle_relationship('block')}
      title={is_blocked === true ? 'Unblock profile' : is_blocked === false ? 'Block profile' : 'Toggle blocking'}
      confirmLabel={is_blocked === true ? 'Unblock' : is_blocked === false ? 'Block' : 'Toggle blocking'}
      message={is_blocked === true ? `Allow @${username} to follow you, buy from your shop, and receive your gifts again?` : `Toggle blocking for @${username}? Blocking removes follows in both directions and prevents them from following you, buying from your shop, or receiving your gifts.`} />
  </>;
}
