import { useState } from 'react';
import type { AuthOpts } from '../../api/client.js';
import type { ItemReview, ShopOrder } from '../../api/shop.js';
import { list_item_reviews, review_purchase } from '../../api/shop.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { useToast } from '../../context/toast_ctx.tsx';
import { FloatingTextarea } from '../ui/floating_input.tsx';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';

export function ItemReviews({ id, auth }: { id: number; auth?: AuthOpts }) {
  const resource = use_profile_resource(() => list_item_reviews(id, auth, 50), `${id}:${auth?.env}:${auth?.token}`);
  return <section className="mt-2">
    <h3>Reviews</h3>
    <ErrorBox error={resource.error} />
    <div className="btn-row"><button type="button" className="secondary" disabled={resource.loading} onClick={resource.reload}>Refresh reviews</button></div>
    {resource.loading && <LoadingRow />}
    {resource.data && <>
      {resource.data.summary.count ? <p className="stat-sub">{resource.data.summary.average.toFixed(1)}/5 from {resource.data.summary.count} reviews</p> : <Empty>No reviews yet</Empty>}
      {resource.data.reviews.map((review) => <article className="card compact mb-2" key={review.id}>
        <div className="row"><strong>@{review.buyer}</strong><span className="stat-sub">{review.rating}/5</span></div>
        {review.body && <p className="profile_prose">{review.body}</p>}
        <time className="stat-sub" dateTime={review.updated}>{new Date(review.updated).toLocaleString()}</time>
      </article>)}
    </>}
  </section>;
}

export function PurchaseReview({ order, auth }: { order: ShopOrder; auth: AuthOpts }) {
  const resource = use_profile_resource(() => order.item_id ? list_item_reviews(order.item_id, auth, 50) : Promise.resolve({ summary: { average: 0, count: 0 }, reviews: [] }), `${order.id}:${order.item_id}:${auth.env}:${auth.token}`);
  if (resource.loading) return <LoadingRow />;
  const review = resource.data?.reviews.find((value) => value.order_id === order.id);
  return <ReviewForm key={review?.updated ?? 'review'} order_id={order.id} auth={auth} review={review} />;
}

function ReviewForm({ order_id, auth, review }: { order_id: number; auth: AuthOpts; review?: ItemReview }) {
  const [rating, set_rating] = useState(review?.rating ?? 5);
  const [body, set_body] = useState(review?.body ?? '');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !Number.isInteger(rating) || rating < 1 || rating > 5 || body.length > 500) return;
    set_busy(true);
    set_error(null);
    try { await review_purchase(auth, order_id, rating, body); toast.success('Review saved'); }
    catch (error) { set_error(error); }
    finally { set_busy(false); }
  }
  return <form className="mt-2" onSubmit={save}>
    <h3>Leave or update your review</h3>
    <p className="stat-sub">Saving replaces any review you already left for this order</p>
    <ErrorBox error={error} />
    <label htmlFor="review_rating">Rating</label>
    <select id="review_rating" disabled={busy} value={rating} onChange={(event) => set_rating(Number(event.target.value))}>
      {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} {value === 1 ? 'star' : 'stars'}</option>)}
    </select>
    <FloatingTextarea id="review_body" label="Review (optional)" maxLength={500} disabled={busy} value={body} onChange={(event) => set_body(event.target.value)} />
    <div className="btn-row"><button disabled={busy}>{busy ? 'Saving...' : 'Save review'}</button></div>
  </form>;
}
