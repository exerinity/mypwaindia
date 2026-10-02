import { useState } from 'react';
import { Link } from 'react-router-dom';
import { get_my_profile, update_profile, profile_platforms, section_types } from '../../api/profile.js';
import type { Profile, ProfileLink, ProfileSection, SectionType, ProfilePlatform } from '../../api/profile.js';
import type { AuthOpts } from '../../api/client.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput, FloatingTextarea } from '../../components/ui/floating_input.tsx';
import { ProfileUpdates } from '../../components/profile/updates.tsx';
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
    const patch = profile_patch(profile, { bio, visibility, balance_visible, links, layout });
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
