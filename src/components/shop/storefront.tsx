import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthOpts } from '../../api/client.js';
import { buy_shop_item, list_shop_items } from '../../api/shop.js';
import type { ShopItem, ShopOrder } from '../../api/shop.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';
import { FloatingInput } from '../ui/floating_input.tsx';
import { Modal } from '../ui/modal.tsx';
import { OrderContent } from './order_content.tsx';
import { safe_http_url, shop_total, purchase_error } from '../../utils/profiles.ts';
import { formatINR } from '../../utils/money.js';

export function ProfileShop({ username, auth, owner }: { username: string; auth?: AuthOpts; owner: boolean }) {
  const resource = use_profile_resource(() => list_shop_items(username, auth), `${username}:${auth?.env}:${auth?.token}`);
  const [selected, set_selected] = useState<ShopItem | null>(null);
  return <div>
    {owner && <div className="btn-row"><Link to="/account/shop" className="btn secondary">Manage shop</Link></div>}
    <ErrorBox error={resource.error} />
    {!!resource.error && <div className="btn-row"><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {resource.loading && <LoadingRow />}
    {resource.data?.items.length === 0 && <Empty>No items for sale.</Empty>}
    <div className="grid cols-3">
      {resource.data?.items.map((item) => {
        const image_url = safe_http_url(item.image_url);
        const sold_out = item.sold_out || item.stock === 0;
        return <article className="card mb-2" key={item.id}>
          {image_url && <img className="profile_image" src={image_url} alt={item.name} loading="lazy" />}
          <h3 className="mt-0">{item.name}</h3>
          <p className="profile_prose">{item.description}</p>
          <div className="stat-card mt-2"><span className="stat-label">Price</span><span className="stat-value">{formatINR(item.price)}</span></div>
          <div className="stat-sub">{sold_out ? 'Sold out' : item.stock == null ? 'Unlimited stock' : `${item.stock} available`} - {item.delivery === 'instant' ? 'Instant delivery' : 'Manual delivery'}</div>
          <div className="btn-row mt-2"><button className="secondary" onClick={() => set_selected(item)}>{owner ? 'View item' : 'View and buy'}</button></div>
        </article>;
      })}
    </div>
    {selected && <BuyItem key={selected.id} item={selected} auth={auth} owner={owner} on_close={() => set_selected(null)} on_purchase={resource.reload} />}
  </div>;
}

function BuyItem({ item, auth, owner, on_close, on_purchase }: {
  item: ShopItem; auth?: AuthOpts; owner: boolean; on_close: () => void; on_purchase: () => void;
}) {
  const [quantity, set_quantity] = useState(1);
  const [answers, set_answers] = useState<Record<string, string | number | boolean>>({});
  const [confirming, set_confirming] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const [order, set_order] = useState<ShopOrder | null>(null);
  const { refetchUserInfo } = useGlobalData();
  const location = useLocation();
  const total = shop_total(item, quantity, answers);
  const validation = purchase_error(item, quantity, answers);

  function set_answer(key: string, value: string | number | boolean | undefined) {
    set_answers((previous) => {
      const next = { ...previous };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function buy() {
    if (!auth || owner || busy || validation || order) return;
    set_busy(true);
    set_error(null);
    try {
      const result = await buy_shop_item(auth, item.id, quantity, answers);
      set_order(result);
      refetchUserInfo().catch(() => {});
      on_purchase();
    } catch (next_error) { set_error(next_error); set_confirming(false); }
    finally { set_busy(false); }
  }

  return <Modal open onClose={() => { if (!busy) on_close(); }} title={order ? 'Your order' : item.name}>
    <div>
      <ErrorBox error={error} />
      {order ? <>
        <h3 className="mt-0">{order.order_id ?? `Order ${order.id}`}</h3>
        <OrderContent order={order} />
        <div className="btn-row"><Link className="btn" to={`/account/shop/order/${order.id}`}>View order</Link></div>
      </> : confirming ? <>
        <h3 className="mt-0">Confirm purchase</h3>
        <p>{quantity} x {item.name}</p>
        <div className="stat-card"><span className="stat-label">Total</span><span className="stat-value">{formatINR(total)}</span></div>
        <div className="btn-row mt-2">
          <button disabled={busy} onClick={buy}>{busy ? 'Purchasing...' : `Pay ${formatINR(total)}`}</button>
          <button className="secondary" disabled={busy} onClick={() => set_confirming(false)}>Back</button>
        </div>
      </> : <form onSubmit={(event) => { event.preventDefault(); if (!validation) set_confirming(true); }}>
        <p className="profile_prose muted">{item.description}</p>
        <FloatingInput id="buy_quantity" label="Quantity" type="number" min={1} step={1} max={item.stock ?? undefined} required value={Number.isNaN(quantity) ? '' : quantity} onChange={(event) => set_quantity(event.target.valueAsNumber)} />
        {(item.options ?? []).map((option, index) => {
          const key = option.key;
          if (!key) return <p key={index} className="muted">Buy this item on the website to fill in {option.label}</p>;
          const id = `buy_option_${index}`;
          if (option.type === 'checkbox') return <label className="checkbox-row" key={key}>
            <input type="checkbox" required={option.required} checked={answers[key] === true} onChange={(event) => set_answer(key, event.target.checked)} />
            {option.label}{option.required ? ' (required)' : ''} (+{formatINR(option.price ?? 0)})
          </label>;
          return <div key={key}>
            {option.type === 'select' ? <>
              <label className="mt-2" htmlFor={id}>{option.label}{option.required ? ' (required)' : ' (optional)'}</label>
              <select id={id} required={option.required} value={answers[key] === undefined ? '' : String(answers[key])}
                onChange={(event) => set_answer(key, event.target.value === '' ? undefined : Number(event.target.value))}>
                <option value="">Choose an option</option>
                {option.choices?.map((choice, choice_index) => <option key={choice_index} value={choice_index}>{choice.label} (+{formatINR(choice.price)})</option>)}
              </select>
            </> : <FloatingInput id={id} label={`${option.label}${option.required ? ' (required)' : ' (optional)'}`} type="text" required={option.required} value={String(answers[key] ?? '')} onChange={(event) => set_answer(key, event.target.value)} />}
          </div>;
        })}
        <div className="stat-card mt-2"><span className="stat-label">Total</span><span className="stat-value">{Number.isFinite(total) ? formatINR(total) : 'Enter a quantity'}</span></div>
        {validation && <p className="muted">{validation}</p>}
        {owner ? <p className="muted">You can't purchase this item because it is yours</p> : <div className="btn-row mt-2">{auth ? <button disabled={!!validation}>Review purchase</button>
          : <Link className="btn" to="/i/flow/login" state={{ from: location }}>Sign in to buy</Link>}</div>}
      </form>}
    </div>
  </Modal>;
}
