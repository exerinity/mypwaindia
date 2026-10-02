import { useState } from 'react';
import { Link } from 'react-router-dom';
import { create_profile_update, delete_profile_update, like_profile_update, list_profile_updates } from '../../api/profile.js';
import type { AuthOpts } from '../../api/client.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { useToast } from '../../context/toast_ctx.tsx';
import { ConfirmModal } from '../ui/confirm_modal.tsx';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';
import { FloatingInput, FloatingTextarea } from '../ui/floating_input.tsx';
import { safe_http_url } from '../../utils/profiles.ts';

export function ProfileUpdates({ username, auth, owner = false, locked = false }: {
  username: string; auth?: AuthOpts; owner?: boolean; locked?: boolean;
}) {
  const resource = use_profile_resource(() => list_profile_updates(username, auth, 50), `${username}:${auth?.env}:${auth?.token}`);
  const [body, set_body] = useState('');
  const [link, set_link] = useState('');
  const [busy, set_busy] = useState(false);
  const [deleting, set_deleting] = useState<number | null>(null);
  const [error, set_error] = useState<unknown>(null);
  const [likes, set_likes] = useState<Record<number, { liked: boolean; likes: number }>>({});
  const toast = useToast();

  async function create_update(event: React.FormEvent) {
    event.preventDefault();
    if (!auth || busy || locked) return;
    if (link && !safe_http_url(link)) { set_error(new Error('enter a http or https link')); return; }
    set_busy(true);
    set_error(null);
    try {
      await create_profile_update(auth, body.trim(), link.trim());
      set_body('');
      set_link('');
      resource.reload();
      toast.success('Update posted');
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  async function toggle_like(id: number) {
    if (!auth || busy) return;
    set_busy(true);
    set_error(null);
    try {
      const result = await like_profile_update(auth, id);
      set_likes((previous) => ({ ...previous, [id]: result }));
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  async function delete_update() {
    if (!auth || deleting === null || busy || locked) return;
    const id = deleting;
    set_deleting(null);
    set_busy(true);
    set_error(null);
    try {
      await delete_profile_update(auth, id);
      resource.reload();
      toast.success('Update deleted');
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  return <div>
    {owner && auth && !locked && <form onSubmit={create_update} className="mb-2">
      <FloatingTextarea id="update_body" label="Post an update" disabled={busy} maxLength={500} required value={body} onChange={(event) => set_body(event.target.value)} />
      <div className="stat-sub mt-1">{body.length}/500</div>
      <FloatingInput id="update_link" label="Link (optional)" disabled={busy} type="url" value={link} onChange={(event) => set_link(event.target.value)} />
      <div className="btn-row mt-2"><button disabled={busy || !body.trim()}>Post update</button></div>
    </form>}
    <ErrorBox error={error || resource.error} />
    {!!resource.error && <div className="btn-row"><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {resource.loading && <LoadingRow />}
    {resource.data?.updates.length === 0 && <Empty>No updates yet.</Empty>}
    {resource.data?.updates.map((update) => {
      const reaction = likes[update.id] ?? update;
      const image_url = safe_http_url(update.image_url);
      const update_link = safe_http_url(update.link);
      return <article className="card mb-2" key={update.id}>
        {update.created && <div className="stat-sub mb-2"><time dateTime={update.created}>{new Date(update.created).toLocaleString()}</time></div>}
        <p className="profile_prose">{update.body}</p>
        {image_url && <img className="profile_image" src={image_url} alt="Update attachment" loading="lazy" />}
        {update_link && <p><a className="profile_prose" href={update_link} target="_blank" rel="noopener noreferrer">{update_link}</a></p>}
        <div className="btn-row mt-2">
          {auth ? <button className="secondary" disabled={busy} aria-pressed={reaction.liked === true} onClick={() => toggle_like(update.id)}>
            {reaction.liked ? 'Unlike' : 'Like'} ({reaction.likes})
          </button> : <><span className="stat-sub">{update.likes} likes</span><Link className="btn secondary" to="/i/flow/login">Sign in to like</Link></>}
          {owner && !locked && <button className="secondary" disabled={busy} onClick={() => set_deleting(update.id)}>Delete</button>}
        </div>
      </article>;
    })}
    <ConfirmModal open={deleting !== null} onClose={() => set_deleting(null)} onConfirm={delete_update}
      title="Delete update" message="Delete this update from your profile?" confirmLabel="Delete" />
  </div>;
}
