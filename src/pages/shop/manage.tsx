import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import type { AuthOpts } from '../../api/client.js';
import { archive_shop_item, list_my_shop_items, list_shop_notifications, list_shop_orders, read_shop_notifications, restock_shop_item } from '../../api/shop.js';
import type { OrderStatus, ShopItem } from '../../api/shop.js';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.ts';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { ConfirmModal } from '../../components/ui/confirm_modal.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Empty, ErrorBox, LoadingRow } from '../../components/ui/status.tsx';
import { FloatingInput } from '../../components/ui/floating_input.tsx';
import { formatINR } from '../../utils/money.js';

const tabs = ['items', 'orders', 'purchases', 'notifications'] as const;

export default function ManageShopPage() {
  usePageTitle('Shop and purchases');
  const { active } = useAuth();
  const [search, set_search] = useSearchParams();
  const selected_tab = search.get('tab');
  const tab = tabs.find((value) => value === selected_tab) ?? 'items';
  if (!active) return null;
  const auth = { token: active.token, env: active.env };
  return <div>
    <h1 className="mt-0">Shop and purchases</h1>
    <nav className="btn-row mb-2" aria-label="Shop navigation">
      {tabs.map((value) => <button key={value} className={tab === value ? '' : 'secondary'} aria-current={tab === value ? 'page' : undefined} onClick={() => set_search({ tab: value })}>
        {value === 'items' ? 'My items' : value === 'orders' ? 'Sales orders' : value === 'purchases' ? 'My purchases' : 'Notifications'}
      </button>)}
    </nav>
    <div key={`${tab}:${active.env}:${active.token}`}>
      {tab === 'items' ? <MyItems auth={auth} account_id={active.id} /> : tab === 'notifications' ? <Notifications auth={auth} /> : <Orders auth={auth} side={tab} />}
    </div>
  </div>;
}

function MyItems({ auth, account_id }: { auth: AuthOpts; account_id: number }) {
  const resource = use_profile_resource(() => list_my_shop_items(auth), `${auth.env}:${auth.token}`);
  const location = useLocation();
  const navigate = useNavigate();
  const [archiving, set_archiving] = useState<ShopItem | null>(null);
  const [restocking, set_restocking] = useState<ShopItem | null>(null);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();
  const { reload } = resource;

  useEffect(() => {
    window.addEventListener('shop_items_updated', reload);
    return () => window.removeEventListener('shop_items_updated', reload);
  }, [reload]);

  function edit_item(item_id: number | null) {
    navigate('/i/flow/edit_item_m', { state: { item_id, account_id, account_env: auth.env, backgroundLocation: location } });
  }

  async function archive() {
    if (!archiving || busy) return;
    const id = archiving.id;
    set_archiving(null);
    set_busy(true);
    set_error(null);
    try { await archive_shop_item(auth, id); toast.success('Item archived'); resource.reload(); }
    catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }

  return <div>
    <div className="btn-row mb-2"><button onClick={() => edit_item(null)} disabled={busy}>New item</button><button className="secondary" onClick={resource.reload} disabled={busy || resource.loading}>Refresh</button></div>
    <ErrorBox error={error || resource.error} />
    {resource.loading && <LoadingRow />}
    {resource.data?.items.length === 0 && <Empty>Nothing!</Empty>}
    {resource.data?.items.map((item) => <article key={item.id} className="card mb-2">
      <h3 className="mt-0">{item.name}</h3>
      <div className="stat-card"><span className="stat-label">Price</span><span className="stat-value">{formatINR(item.price)}</span></div>
      <div className="stat-sub">{item.status ?? 'active'} - {item.stock == null ? 'Unlimited stock' : `${item.stock} in stock`} - {item.sold ?? 0} sold</div>
      {item.status !== 'archived' && <div className="btn-row mt-2">
        <button className="secondary" disabled={busy} onClick={() => edit_item(item.id)}>Edit</button>
        <button className="secondary" disabled={busy} onClick={() => set_restocking(item)}>Stock and visibility</button>
        <button className="secondary" disabled={busy} onClick={() => set_archiving(item)}>Archive</button>
      </div>}
    </article>)}
    {restocking && <Restock key={restocking.id} item={restocking} auth={auth} on_close={() => set_restocking(null)} on_save={() => { set_restocking(null); resource.reload(); }} />}
    <ConfirmModal open={archiving !== null} onClose={() => set_archiving(null)} onConfirm={archive} title="Archive item" confirmLabel="Archive"
      message="Permanently take this item off sale? Past orders will still refer to it" />
  </div>;
}

function Restock({ item, auth, on_close, on_save }: { item: ShopItem; auth: AuthOpts; on_close: () => void; on_save: () => void }) {
  const [stock, set_stock] = useState(item.stock == null ? '' : String(item.stock));
  const [hidden, set_hidden] = useState(item.status === 'hidden');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const value = stock.trim() ? Number(stock) : null;
    if (value !== null && (!Number.isSafeInteger(value) || value < 0)) { set_error(new Error('Enter nonnegative whole stock, or leave blank for unlimited')); return; }
    set_busy(true);
    set_error(null);
    try { await restock_shop_item(auth, item.id, value, hidden); on_save(); }
    catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }
  return <Modal open onClose={() => { if (!busy) on_close(); }} title="Stock and visibility">
    <form onSubmit={save}>
      <ErrorBox error={error} />
      <FloatingInput id="restock_stock" label="Stock (blank for unlimited)" type="number" min={0} step={1} disabled={busy} value={stock} onChange={(event) => set_stock(event.target.value)} />
      <label className="checkbox-row"><input type="checkbox" disabled={busy} checked={hidden} onChange={(event) => set_hidden(event.target.checked)} />Hide from my profile</label>
      <div className="btn-row"><button disabled={busy}>{busy ? 'Saving...' : 'Save'}</button></div>
    </form>
  </Modal>;
}

function Orders({ auth, side }: { auth: AuthOpts; side: 'orders' | 'purchases' }) {
  const [page, set_page] = useState(1);
  const [status, set_status] = useState<OrderStatus | ''>('');
  const resource = use_profile_resource(() => list_shop_orders(auth, side, page, status || undefined), `${side}:${page}:${status}:${auth.env}:${auth.token}`);
  return <div>
    <div className="table-controls">
      <label htmlFor="order_status">Filter by status
        <select id="order_status" value={status} onChange={(event) => { set_status(event.target.value as OrderStatus | ''); set_page(1); }}>
          <option value="">All statuses</option>{['in_review', 'pending', 'fulfilled', 'refunded'].map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
        </select>
      </label>
      <button className="secondary" disabled={resource.loading} onClick={resource.reload}>Refresh</button>
    </div>
    <ErrorBox error={resource.error} />
    {resource.loading && <LoadingRow />}
    {resource.data?.orders.length === 0 && <Empty>Nothing!</Empty>}
    {resource.data?.orders.map((order) => <article className="card mb-2" key={order.id}>
      <h3 className="mt-0">{order.item_name ?? `Order ${order.id}`}</h3>
      <div className="stat-sub">{order.order_id} - {order.status.replace('_', ' ')}</div>
      {order.total != null && <div className="stat-card mt-2"><span className="stat-label">Total</span><span className="stat-value">{formatINR(order.total)}</span></div>}
      <div className="stat-sub">{side === 'orders' ? `Buyer: @${order.buyer ?? ''}` : `Seller: @${order.seller ?? ''}`}</div>
      <div className="btn-row mt-2"><Link className="btn secondary" to={`/account/shop/order/${order.id}`}>View order and delivery</Link></div>
    </article>)}
    <Pagination page={page} last_page={resource.data?.last_page ?? page} busy={resource.loading} on_page={set_page} />
  </div>;
}

function Notifications({ auth }: { auth: AuthOpts }) {
  const [page, set_page] = useState(1);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const resource = use_profile_resource(() => list_shop_notifications(auth, page), `${page}:${auth.env}:${auth.token}`);
  async function mark_read() {
    if (busy) return;
    set_busy(true);
    set_error(null);
    try { await read_shop_notifications(auth); resource.reload(); }
    catch (next_error) { set_error(next_error); }
    finally { set_busy(false); }
  }
  return <div>
    <div className="btn-row row mb-2"><span className="stat-sub">{resource.data?.unread ?? 0} unread</span><button disabled={busy || resource.loading || !resource.data?.unread} onClick={mark_read}>Mark all as read</button><button className="secondary" disabled={busy || resource.loading} onClick={resource.reload}>Refresh</button></div>
    <ErrorBox error={error || resource.error} />
    {resource.loading && <LoadingRow />}
    {resource.data?.notifications.length === 0 && <Empty>Nothing!</Empty>}
    {resource.data?.notifications.map((notification) => <article className="card mb-2" key={notification.id}>
      <p>{!notification.read && <strong>Unread: </strong>}{notification.message}</p>
      <div className="stat-sub mt-1"><time dateTime={notification.created}>{new Date(notification.created).toLocaleString()}</time></div>
      {notification.order_id != null && <div className="btn-row"><Link className="btn secondary" to={`/account/shop/order/${notification.order_id}`}>View order</Link></div>}
    </article>)}
    <Pagination page={page} last_page={resource.data?.last_page ?? page} busy={resource.loading || busy} on_page={set_page} />
  </div>;
}

function Pagination({ page, last_page, busy, on_page }: { page: number; last_page: number; busy: boolean; on_page: (page: number) => void }) {
  return <div className="row mt-2"><button className="secondary" disabled={busy || page <= 1} onClick={() => on_page(page - 1)}>Previous</button><span className="stat-sub">Page {page} of {Math.max(1, last_page)}</span><button className="secondary" disabled={busy || page >= last_page} onClick={() => on_page(page + 1)}>Next</button></div>;
}
