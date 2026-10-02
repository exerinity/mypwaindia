import { useState } from 'react';
import { Link } from 'react-router-dom';
import { get_my_profile, update_profile, profile_platforms, section_types, pride_flags, avatar_accessories, profile_accents } from '../../api/profile.js';
import type { Profile, ProfileLink, ProfilePatch, ProfileSection, SectionType, ProfilePlatform, PrideFlag, StatusExpiry } from '../../api/profile.js';
import type { AuthOpts } from '../../api/client.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput, FloatingTextarea } from '../../components/ui/floating_input.tsx';
import { ProfileUpdates } from '../../components/profile/updates.tsx';
import { PrideFlagTag } from '../../components/data/team_member_card.tsx';
import countries from '../../data/countries.json';
import { profile_path, profile_web_url, profile_patch, safe_http_url, section_title } from '../../utils/profiles.ts';

export default function EditProfilePage() {
  usePageTitle('My profile');
  const { active } = useAuth();
  if (!active) return null;
  return <ProfileEditor key={`${active.env}:${active.token}`} auth={{ token: active.token, env: active.env }} username={active.username} />;
}

function ProfileEditor({ auth, username }: { auth: AuthOpts; username: string }) {
  const resource = use_profile_resource(() => get_my_profile(auth), `${auth.env}:${auth.token}`);
  return <>
    <h1 className="mt-0">My profile</h1>
    <p className="muted" style={{ marginTop: -8, marginBottom: 16, fontSize: '0.9rem' }}>
      <Link to={profile_path(username)}>View profile</Link>
    </p>
    <ErrorBox error={resource.error} />
    {!!resource.error && <div className="btn-row"><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {resource.loading && <LoadingRow />}
    {resource.data && <ProfileForm key={JSON.stringify(resource.data)} profile={resource.data} auth={auth} username={username} on_save={resource.reload} />}
  </>;
}

function ProfileForm({ profile, auth, username, on_save }: { profile: Profile; auth: AuthOpts; username: string; on_save: () => void }) {
  const [bio, set_bio] = useState(profile.bio ?? '');
  const [personalization, set_personalization] = useState<Required<Pick<ProfilePatch, 'pronouns' | 'pride_flags' | 'avatar_flag' | 'avatar_accessory' | 'country' | 'accent'>>>({
    pronouns: profile.pronouns ?? '', pride_flags: profile.pride_flags ?? [], avatar_flag: profile.avatar_flag ?? '',
    avatar_accessory: profile.avatar_accessory ?? '', country: profile.country ?? '', accent: profile.accent ?? 'brand',
  });
  const [status_emoji, set_status_emoji] = useState(profile.status?.emoji ?? '');
  const [status_text, set_status_text] = useState(profile.status?.text ?? '');
  const [status_expiry, set_status_expiry] = useState<StatusExpiry>(profile.status?.expires_at === null ? 'never' : '1d');
  const [expiry_changed, set_expiry_changed] = useState(false);
  const [visibility, set_visibility] = useState<'public' | 'private'>(profile.visibility === 'private' ? 'private' : 'public');
  const [balance_visible, set_balance_visible] = useState(profile.balance_visible ?? false);
  const [links, set_links] = useState<ProfileLink[]>(profile.links ?? []);
  const [layout, set_layout] = useState<ProfileSection[]>(profile.sections ?? []);
  const [section_type, set_section_type] = useState<SectionType>('shop');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();
  const locked = profile.locked === true;

  function update_section(index: number, patch: Partial<ProfileSection>) {
    set_layout((previous) => previous.map((section, current) => current === index ? { ...section, ...patch } : section));
  }
  function move_section(index: number, direction: number) {
    set_layout((previous) => {
      const next = [...previous];
      const destination = index + direction;
      if (destination < 0 || destination >= next.length) return previous;
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });
  }
  function update_link(index: number, patch: Partial<ProfileLink>) {
    set_links((previous) => previous.map((link, current) => current === index ? { ...link, ...patch } : link));
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || locked) return;
    if (links.some((link) => !safe_http_url(link.url))) { set_error(new Error('Every social link needs an http or https URL.')); return; }
    const patch = profile_patch(profile, { bio, visibility, balance_visible, links, layout, personalization, status_emoji, status_text, status_expiry, expiry_changed });
    if (!Object.keys(patch).length) { toast.info('No changes to save'); return; }
    set_busy(true);
    set_error(null);
    try {
      await update_profile(auth, patch);
      toast.success('Profile saved');
      on_save();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  return <>
    {locked && <div className="alert alert-warning">Staff have locked your profile. It is private and read-only.</div>}
    <form onSubmit={save}>
      <ErrorBox error={error} />
      <section className="card mb-2">
        <h3 className="mt-0">Profile</h3>
        <FloatingTextarea id="profile_bio" label="Bio" disabled={locked || busy} maxLength={500} value={bio} onChange={(event) => set_bio(event.target.value)} />
        <div className="stat-sub mt-1">{bio.length}/500</div>
        <label htmlFor="profile_visibility">Visibility</label>
        <select id="profile_visibility" disabled={locked || busy} value={visibility} onChange={(event) => set_visibility(event.target.value as 'public' | 'private')}>
          <option value="public">Public</option><option value="private">Private</option>
        </select>
        <label className="checkbox-row"><input type="checkbox" disabled={locked || busy} checked={balance_visible} onChange={(event) => set_balance_visible(event.target.checked)} />Show my balance</label>
        <p className="muted">Avatar and banner uploads are available on MyPayIndia.com</p>
        <div className="btn-row"><a className="btn secondary" href={profile_web_url(username)} target="_blank" rel="noopener noreferrer">Manage images on MyPayIndia.com</a></div>
      </section>
      <section className="card mb-2">
        <h3 className="mt-0">About you</h3>
        <FloatingInput id="profile_pronouns" label="Pronouns" disabled={locked || busy} maxLength={40} value={personalization.pronouns} onChange={(event) => set_personalization({ ...personalization, pronouns: event.target.value })} />
        <label htmlFor="profile_country">Country</label>
        <select id="profile_country" disabled={locked || busy} value={personalization.country} onChange={(event) => set_personalization({ ...personalization, country: event.target.value })}>
          {Object.entries(countries).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
        </select>
        <h3 className="mt-2">Pride flags</h3>
        <div className="row" style={{ gap: '4px 20px' }}>
          {pride_flags.map((flag) => <label className="checkbox-row" key={flag} style={{ margin: 0, padding: '4px 0' }}>
            <input type="checkbox" disabled={locked || busy} checked={personalization.pride_flags.includes(flag)} onChange={(event) => set_personalization({ ...personalization, pride_flags: event.target.checked ? [...personalization.pride_flags, flag] : personalization.pride_flags.filter((value) => value !== flag) })} />
            <PrideFlagTag flag={flag} />{section_title(flag)}
          </label>)}
        </div>
        <label htmlFor="profile_avatar_flag">Avatar flag</label>
        <select id="profile_avatar_flag" disabled={locked || busy} value={personalization.avatar_flag} onChange={(event) => set_personalization({ ...personalization, avatar_flag: event.target.value as PrideFlag | '' })}>
          <option value="">None</option>{pride_flags.map((flag) => <option key={flag} value={flag}>{section_title(flag)}</option>)}
        </select>
        <label htmlFor="profile_avatar_accessory">Avatar accessory</label>
        <select id="profile_avatar_accessory" disabled={locked || busy} value={personalization.avatar_accessory} onChange={(event) => set_personalization({ ...personalization, avatar_accessory: event.target.value as typeof personalization.avatar_accessory })}>
          <option value="">None</option>{avatar_accessories.map((accessory) => <option key={accessory} value={accessory}>{section_title(accessory)}</option>)}
        </select>
        <label htmlFor="profile_accent">Profile accent</label>
        <select id="profile_accent" disabled={locked || busy} value={personalization.accent} onChange={(event) => set_personalization({ ...personalization, accent: event.target.value as typeof personalization.accent })}>
          {profile_accents.map((accent) => <option key={accent} value={accent}>{section_title(accent)}</option>)}
        </select>
      </section>
      <section className="card mb-2">
        <h3 className="mt-0">Status</h3>
        <FloatingInput id="profile_status_emoji" label="Status emoji (optional)" disabled={locked || busy} value={status_emoji} onChange={(event) => set_status_emoji(event.target.value)} />
        <FloatingInput id="profile_status_text" label="Status text" disabled={locked || busy} maxLength={80} value={status_text} onChange={(event) => set_status_text(event.target.value)} />
        <label htmlFor="profile_status_expiry">Clear changed status after</label>
        <select id="profile_status_expiry" disabled={locked || busy} value={status_expiry} onChange={(event) => { set_status_expiry(event.target.value as StatusExpiry); set_expiry_changed(true); }}>
          <option value="1h">1 hour</option><option value="1d">1 day</option><option value="1w">1 week</option><option value="never">Never</option>
        </select>
        {profile.status?.expires_at && <p className="stat-sub">Current status clears {new Date(profile.status.expires_at).toLocaleString()}</p>}
        <div className="btn-row"><button type="button" className="secondary" disabled={locked || busy} onClick={() => { set_status_emoji(''); set_status_text(''); }}>Clear status</button></div>
      </section>
      <section className="card mb-2">
        <h3 className="mt-0">Social links</h3>
        {links.map((link, index) => <div className="card compact mb-2" key={index}>
          <label htmlFor={`profile_platform_${index}`}>Platform</label>
          <select id={`profile_platform_${index}`} disabled={locked || busy} value={link.platform} onChange={(event) => update_link(index, { platform: event.target.value as ProfilePlatform })}>
            {profile_platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
          </select>
          <FloatingInput id={`profile_url_${index}`} label="URL" disabled={locked || busy} type="url" required value={link.url} onChange={(event) => update_link(index, { url: event.target.value })} />
          <button type="button" className="secondary mt-2" disabled={locked || busy} onClick={() => set_links(links.filter((_, current) => current !== index))}>Remove link</button>
        </div>)}
        <button type="button" className="secondary" disabled={locked || busy} onClick={() => set_links([...links, { platform: 'website', url: '' }])}>Add link</button>
      </section>
      <section className="card mb-2">
        <h3 className="mt-0">Section layout</h3>
        <p className="muted mb-2">Sections appear in this order. Additional section content can be edited on MyPayIndia.com</p>
        {layout.map((section, index) => <div className="card compact mb-2" key={index}>
          <h3 className="mt-0">{section_title(section.type)}</h3>
          <FloatingInput id={`section_title_${index}`} label="Title" disabled={locked || busy} type="text" value={typeof section.config?.title === 'string' ? section.config.title : section.title ?? ''}
            onChange={(event) => update_section(index, { title: event.target.value, config: { ...section.config, title: event.target.value } })} />
          <label className="checkbox-row"><input type="checkbox" disabled={locked || busy} checked={section.visible} onChange={(event) => update_section(index, { visible: event.target.checked })} />Visible</label>
          {section.type === 'supporters' && <label className="checkbox-row"><input type="checkbox" disabled={locked || busy} checked={section.config?.include_shop !== false} onChange={(event) => update_section(index, { config: { ...section.config, include_shop: event.target.checked } })} />Include shop customers (minus refunds)</label>}
          <div className="btn-row">
            <button type="button" className="secondary" disabled={locked || busy || index === 0} aria-label={`Move ${section_title(section.type)} up`} onClick={() => move_section(index, -1)}>Move up</button>
            <button type="button" className="secondary" disabled={locked || busy || index === layout.length - 1} aria-label={`Move ${section_title(section.type)} down`} onClick={() => move_section(index, 1)}>Move down</button>
            <button type="button" className="secondary" disabled={locked || busy} onClick={() => set_layout(layout.filter((_, current) => current !== index))}>Remove section</button>
          </div>
        </div>)}
        <label htmlFor="new_section">New section</label>
        <select id="new_section" disabled={locked || busy} value={section_type} onChange={(event) => set_section_type(event.target.value as SectionType)}>
          {section_types.map((type) => <option key={type} value={type}>{section_title(type)}</option>)}
        </select>
        <button type="button" className="secondary mt-2" disabled={locked || busy} onClick={() => set_layout([...layout, { type: section_type, visible: true, config: { title: section_title(section_type) } }])}>Add section</button>
      </section>
      <div className="btn-row mb-2"><button disabled={locked || busy}>{busy ? 'Saving...' : 'Save profile'}</button></div>
    </form>
    <section className="card"><h3 className="mt-0">Updates</h3><ProfileUpdates username={username} auth={auth} owner locked={locked} /></section>
  </>;
}
