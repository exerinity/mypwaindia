import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { cancel_shop_purchase, fulfill_shop_order, get_shop_order, refund_shop_order } from '../../api/shop.js';
import type { ShopOrder } from '../../api/shop.js';
import type { AuthOpts } from '../../api/client.js';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingTextarea } from '../../components/ui/floating_input.tsx';
import { OrderContent } from '../../components/shop/order_content.tsx';
import { formatINR } from '../../utils/money.js';
import { order_actions, profile_path, safe_http_url } from '../../utils/profiles.ts';

export default function ShopOrderPage() {
  usePageTitle('Shop order');
  const { id } = useParams();
  const { active } = useAuth();
  const order_id = Number(id);
  if (!Number.isSafeInteger(order_id) || order_id < 1) return <ErrorBox error={new Error('Invalid order id.')} />;
  if (!active) return null;
  return <OrderView key={`${order_id}:${active.env}:${active.token}`} id={order_id} auth={{ token: active.token, env: active.env }} username={active.username} />;
}

function OrderView({ id, auth, username }: { id: number; auth: AuthOpts; username: string }) {
  const resource = use_profile_resource(() => get_shop_order(auth, id), `${id}:${auth.env}:${auth.token}`);
  return <div>
    <h1 className="mt-0">Shop order</h1>
    <ErrorBox error={resource.error} />
    <div className="btn-row"><button className="secondary" disabled={resource.loading} onClick={resource.reload}>Refresh order</button></div>
    {resource.loading && <LoadingRow />}
    {resource.data && <OrderDetails key={JSON.stringify(resource.data)} order={resource.data} auth={auth} username={username} on_change={resource.reload} />}
  </div>;
}

function OrderDetails({ order, auth, username, on_change }: { order: ShopOrder; auth: AuthOpts; username: string; on_change: () => void }) {
  const [type, set_type] = useState<'text' | 'url'>('text');
  const [content, set_content] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const [confirm, set_confirm] = useState<'refund' | 'cancel' | null>(null);
  const toast = useToast();
  const { refetchUserInfo } = useGlobalData();
  const actions = order_actions(order, username);

  async function act(action: 'fulfill' | 'refund' | 'cancel') {
    if (busy) return;
    if (action === 'fulfill' && (!content.trim() || (type === 'url' && !safe_http_url(content)))) { set_error(new Error('Enter valid delivery content.')); return; }
    set_confirm(null);
    set_busy(true);
    set_error(null);
    try {
      if (action === 'fulfill') await fulfill_shop_order(auth, order.id, type, content);
      if (action === 'refund') await refund_shop_order(auth, order.id);
      if (action === 'cancel') await cancel_shop_purchase(auth, order.id);
      toast.success(action === 'fulfill' ? 'Order delivered' : 'Order refunded');
      refetchUserInfo().catch(() => {});
      on_change();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  return <article className="card mb-2">
    <ErrorBox error={error} />
    <h3 className="mt-0">{order.item_name ?? `Order ${order.id}`}</h3>
    <div className="stat-sub">{order.order_id ?? `Order ${order.id}`}</div>
    <div className="grid cols-2 mt-2 mb-2">
      <div><div className="stat-label">Status</div><div>{order.status.replace('_', ' ')}</div></div>
      {order.created && <div><div className="stat-label">Placed</div><time dateTime={order.created}>{new Date(order.created).toLocaleString()}</time></div>}
      {order.buyer && <div><div className="stat-label">Buyer</div><Link to={profile_path(order.buyer)}>@{order.buyer}</Link></div>}
      {order.seller && <div><div className="stat-label">Seller</div><Link to={profile_path(order.seller)}>@{order.seller}</Link></div>}
      {order.quantity != null && <div><div className="stat-label">Quantity</div><div>{order.quantity}</div></div>}
      {order.total != null && <div className="stat-card"><span className="stat-label">Total</span><span className="stat-value">{formatINR(order.total)}</span></div>}
    </div>
    {order.selections?.map((selection) => <div className="stat-sub" key={selection.key}>{selection.label}: {String(selection.value)} (+{formatINR(selection.price)})</div>)}
    <div className="btn-row">
      {order.transaction_id && <Link className="btn secondary" to={`/i/flow/transaction/${encodeURIComponent(order.transaction_id)}`}>Payment transaction</Link>}
      {order.refund_transaction_id && <Link className="btn secondary" to={`/i/flow/transaction/${encodeURIComponent(order.refund_transaction_id)}`}>Refund transaction</Link>}
    </div>
    <OrderContent order={order} />
    {actions.fulfill && <form className="mt-2" onSubmit={(event) => { event.preventDefault(); act('fulfill'); }}>
      <h3 className="mt-0">Deliver this order</h3>
      <label htmlFor="fulfill_type">Delivery type</label><select id="fulfill_type" value={type} disabled={busy} onChange={(event) => set_type(event.target.value as 'text' | 'url')}>
        <option value="text">Text</option><option value="url">URL</option>
      </select>
      <FloatingTextarea id="fulfill_content" label="Delivery content" maxLength={5000} required disabled={busy} value={content} onChange={(event) => set_content(event.target.value)} />
      <p className="muted">The buyer will be notified and emailed. Image deliveries are available on MyPayIndia.com</p>
      <div className="btn-row mt-2">
        <button disabled={busy || !content.trim()}>Deliver order</button>
        <button className="secondary" type="button" disabled={busy} onClick={() => set_confirm('refund')}>Refund order</button>
      </div>
    </form>}
    {actions.cancel && <div className="btn-row"><button disabled={busy} onClick={() => set_confirm('cancel')}>Cancel purchase for full refund</button></div>}
    <ConfirmModal open={confirm !== null} onClose={() => set_confirm(null)} onConfirm={() => { if (confirm) act(confirm); }}
      title={confirm === 'refund' ? 'Refund order' : 'Cancel purchase'} confirmLabel={confirm === 'refund' ? 'Refund' : 'Cancel purchase'}
      message={confirm === 'refund' ? 'Return the payment to the buyer and restore the stock?' : 'Cancel this purchase under review and return the payment to your balance?'} />
  </article>;
}
