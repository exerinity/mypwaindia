import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { useState } from 'react';
import type { AuthOpts } from '../../api/client.js';
import { list_order_messages, send_order_message } from '../../api/shop.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { FloatingTextarea } from '../ui/floating_input.tsx';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';

export function OrderMessages({ id, auth }: { id: number; auth: AuthOpts }) {
  const resource = use_profile_resource(() => list_order_messages(auth, id), `${id}:${auth.env}:${auth.token}`);
  const [body, set_body] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !body.trim() || body.length > 1000) return;
    set_busy(true);
    set_error(null);
    try { await send_order_message(auth, id, body.trim()); set_body(''); resource.reload(); }
    catch (error) { set_error(error); }
    finally { set_busy(false); }
  }
  return <section className={`mt-2 ${utility_classes.mt_2}`}>
    <h3>Order messages</h3>
    <p className={stat_classes.sub}>The buyer, seller, and gift recipient can read these messages</p>
    <ErrorBox error={error || resource.error} />
    <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button className="secondary" disabled={resource.loading || busy} onClick={resource.reload}>Refresh messages</button></div>
    {resource.loading && <LoadingRow />}
    {resource.data?.messages.length === 0 && <Empty>No messages yet.</Empty>}
    {resource.data?.messages.map((message) => <article className={`card compact mb-2 ${card_classes.compact} ${utility_classes.mb_2}`} key={message.id}>
      <strong>@{message.author}</strong>
      <p className={`profile_prose ${profile_classes.prose}`}>{message.body}</p>
      <time className={stat_classes.sub} dateTime={message.created}>{new Date(message.created).toLocaleString()}</time>
    </article>)}
    <form onSubmit={send}>
      <FloatingTextarea id="order_message" label="Message" required maxLength={1000} disabled={busy} value={body} onChange={(event) => set_body(event.target.value)} />
      <div className={stat_classes.sub}>{body.length}/1000</div>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button disabled={busy || !body.trim()}>{busy ? 'Sending...' : 'Send message'}</button></div>
    </form>
  </section>;
}
