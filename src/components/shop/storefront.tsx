import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { form_classes } from '../../styles/forms.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthOpts } from '../../api/client.js';
import { buy_shop_item, get_shop_item, list_saved_items, list_shop_items, toggle_saved_item } from '../../api/shop.js';
import type { ShopItem, ShopListing, ShopOrder } from '../../api/shop.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { useGlobalData } from '../../context/global_data_ctx.tsx';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';
import { FloatingInput } from '../ui/floating_input.tsx';
import { Modal } from '../ui/modal.tsx';
import { OrderContent } from './order_content.tsx';
import { ItemReviews } from './reviews.tsx';
import { safe_http_url, shop_total, purchase_error } from '../../utils/profiles.ts';
import { formatINR, rupeesToPaisa } from '../../utils/money.js';

export function ProfileShop({ username, auth, owner }: { username: string; auth?: AuthOpts; owner: boolean }) {
  return <ShopCatalog username={username} auth={auth} owner={owner} />;
}

export function SavedShopItems({ auth }: { auth: AuthOpts }) {
  return <ShopCatalog auth={auth} saved />;
}

function ShopCatalog({ username, auth, owner = false, saved = false }: { username?: string; auth?: AuthOpts; owner?: boolean; saved?: boolean }) {
  const resource = use_profile_resource<{ items: ShopListing[] }>(() => saved && auth ? list_saved_items(auth) : list_shop_items(username ?? '', auth), `${saved}:${username}:${auth?.env}:${auth?.token}`);
  const saved_resource = use_profile_resource(() => auth && !saved ? list_saved_items(auth) : Promise.resolve({ items: [] }), `${saved}:${auth?.env}:${auth?.token}`);
  const [selected, set_selected] = useState<number | null>(null);
  const [saving, set_saving] = useState<number | null>(null);
  const [save_error, set_save_error] = useState<unknown>(null);
  const saved_ids = new Set((saved ? resource : saved_resource).data?.items.map((item) => item.id) ?? []);
  async function save_item(id: number) {
    if (!auth || saving !== null) return;
    set_saving(id);
    set_save_error(null);
    try { await toggle_saved_item(auth, id); if (saved) resource.reload(); else saved_resource.reload(); }
    catch (error) { set_save_error(error); }
    finally { set_saving(null); }
  }
  return <div>
    {owner && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><Link to="/account/shop" className="btn secondary">Manage shop</Link></div>}
    {saved && <><p className={`muted ${utility_classes.muted}`}>You will be notified when a saved item comes back in stock</p><div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button className="secondary" disabled={resource.loading} onClick={resource.reload}>Refresh</button></div></>}
    <ErrorBox error={resource.error || saved_resource.error || save_error} />
    {!!(resource.error || saved_resource.error) && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button className="secondary" onClick={() => { resource.reload(); saved_resource.reload(); }}>Retry</button></div>}
    {resource.loading && <LoadingRow />}
    {resource.data?.items.length === 0 && <Empty>{saved ? 'No saved items.' : 'No items for sale.'}</Empty>}
    <div className={`grid cols-3 ${card_classes.grid_three}`}>
      {resource.data?.items.map((item) => {
        const image_url = safe_http_url(item.image_url);
        const sold_out = item.sold_out || item.stock === 0;
        return <article className={`card mb-2 ${card_classes.card} ${utility_classes.mb_2}`} key={item.id}>
          {image_url && <img className={`profile_image ${profile_classes.image}`} src={image_url} alt={item.name} loading="lazy" />}
          <h3 className={`mt-0 ${utility_classes.mt_0}`}>{item.name}</h3>
          <p className={`profile_prose ${profile_classes.prose}`}>{item.description}</p>
          <div className={`${stat_classes.card} mt-2 ${utility_classes.mt_2}`}><span className={stat_classes.label}>{item.pwyw ? 'Minimum price' : 'Price'}</span><span className={stat_classes.value}>{formatINR(item.price)}</span></div>
          <div className={stat_classes.sub}>{sold_out ? 'Sold out' : item.stock == null ? 'Unlimited stock' : `${item.stock} available`}{item.delivery && ` - ${item.delivery === 'instant' ? 'Instant delivery' : 'Manual delivery'}`}</div>
          {item.pwyw && <div className={stat_classes.sub}>Pay what you want</div>}
          <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>
            <button className="secondary" onClick={() => set_selected(item.id)}>{owner ? 'View item' : 'View and buy'}</button>
            {auth && !owner && <button className="secondary" disabled={saving !== null || (!saved && !saved_resource.data)} aria-pressed={saved_ids.has(item.id)} onClick={() => save_item(item.id)}>{saved_ids.has(item.id) ? 'Remove saved item' : 'Save item'}</button>}
          </div>
        </article>;
      })}
    </div>
    {selected !== null && <ShopItemModal key={selected} id={selected} auth={auth} owner={owner} on_close={() => set_selected(null)} on_purchase={resource.reload} />}
  </div>;
}

function ShopItemModal({ id, auth, owner, on_close, on_purchase }: { id: number; auth?: AuthOpts; owner: boolean; on_close: () => void; on_purchase: () => void }) {
  const resource = use_profile_resource(() => get_shop_item(id, auth), `${id}:${auth?.env}:${auth?.token}`);
  if (resource.data) return <BuyItem item={resource.data} auth={auth} owner={owner} on_close={on_close} on_purchase={on_purchase} />;
  return <Modal open onClose={on_close} title="Shop item"><ErrorBox error={resource.error} />{resource.loading && <LoadingRow />}{!!resource.error && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button className="secondary" onClick={resource.reload}>Retry</button></div>}</Modal>;
}

function BuyItem({ item, auth, owner, on_close, on_purchase }: {
  item: ShopItem; auth?: AuthOpts; owner: boolean; on_close: () => void; on_purchase: () => void;
}) {
  const [quantity, set_quantity] = useState(1);
  const [answers, set_answers] = useState<Record<string, string | number | boolean>>({});
  const [amount, set_amount] = useState('');
  const [discount_code, set_discount_code] = useState('');
  const [gift_to, set_gift_to] = useState('');
  const [confirming, set_confirming] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const [order, set_order] = useState<ShopOrder | null>(null);
  const { refetchUserInfo } = useGlobalData();
  const location = useLocation();
  const unit_amount = item.pwyw && amount.trim() ? rupeesToPaisa(amount) : undefined;
  const total = shop_total(item, quantity, answers, unit_amount);
  const minimum = shop_total(item, 1, answers);
  const recipient = gift_to.trim().replace(/^@/, '');
  const validation = purchase_error(item, quantity, answers, unit_amount) ?? (gift_to.trim() && !recipient ? 'Enter a gift recipient username.' : undefined);

  function set_answer(key: string, value: string | number | boolean | undefined) {
    set_answers((previous) => {
      const next = { ...previous };
      if (value === undefined) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  async function buy() {
    if (!auth || owner || busy || !confirming || validation || order) return;
    set_busy(true);
    set_error(null);
    try {
      const result = await buy_shop_item(auth, item.id, quantity, answers, {
        ...(discount_code.trim() ? { discount_code: discount_code.trim() } : {}), ...(recipient ? { gift_to: recipient } : {}),
        ...(unit_amount === undefined ? {} : { amount: unit_amount }),
      });
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
        <h3 className={`mt-0 ${utility_classes.mt_0}`}>{order.order_id ?? `Order ${order.id}`}</h3>
        {order.total != null && <div className={`${stat_classes.card} mb-2 ${utility_classes.mb_2}`}><span className={stat_classes.label}>Charged total</span><span className={stat_classes.value}>{formatINR(order.total)}</span></div>}
        <OrderContent order={order} />
        <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><Link className="btn" to={`/account/shop/order/${order.id}`}>View order</Link></div>
      </> : confirming ? <>
        <h3 className={`mt-0 ${utility_classes.mt_0}`}>Confirm purchase</h3>
        <p>{quantity} x {item.name}</p>
        {recipient && <p>Gift for @{recipient}. Only the recipient will see the delivery</p>}
        <div className={stat_classes.card}><span className={stat_classes.label}>{discount_code.trim() ? 'Before discount' : 'Total'}</span><span className={stat_classes.value}>{formatINR(total)}</span></div>
        {discount_code.trim() && <p className={`muted ${utility_classes.muted}`}>Code: {discount_code.trim()}. The discount is applied at checkout. Your order will show the charged total</p>}
        <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>
          <button disabled={busy} onClick={buy}>{busy ? 'Purchasing...' : `${discount_code.trim() ? 'Pay up to' : 'Pay'} ${formatINR(total)}`}</button>
          <button className="secondary" disabled={busy} onClick={() => set_confirming(false)}>Back</button>
        </div>
      </> : <form onSubmit={(event) => { event.preventDefault(); if (!validation) set_confirming(true); }}>
        <p className={`profile_prose muted ${profile_classes.prose} ${utility_classes.muted}`}>{item.description}</p>
        {item.pwyw ? <p className={stat_classes.sub}>Pay what you want purchases have a quantity of 1.</p> : <FloatingInput id="buy_quantity" label="Quantity" type="number" min={1} step={1} max={item.stock ?? undefined} required value={Number.isNaN(quantity) ? '' : quantity} onChange={(event) => set_quantity(event.target.valueAsNumber)} />}
        {(item.options ?? []).map((option, index) => {
          const key = option.key;
          if (!key) return <p key={index} className={`muted ${utility_classes.muted}`}>Buy this item on MyPayIndia.com to fill in {option.label}</p>;
          const id = `buy_option_${index}`;
          if (option.type === 'checkbox') return <label className={`checkbox-row ${form_classes.checkbox_row}`} key={key}>
            <input type="checkbox" required={option.required} checked={answers[key] === true} onChange={(event) => set_answer(key, event.target.checked)} />
            {option.label}{option.required ? ' (required)' : ''} (+{formatINR(option.price ?? 0)})
          </label>;
          return <div key={key}>
            {option.type === 'select' ? <>
              <label className={`mt-2 ${utility_classes.mt_2}`} htmlFor={id}>{option.label}{option.required ? ' (required)' : ' (optional)'}</label>
              <select id={id} required={option.required} value={answers[key] === undefined ? '' : String(answers[key])}
                onChange={(event) => set_answer(key, event.target.value === '' ? undefined : Number(event.target.value))}>
                <option value="">Choose an option</option>
                {option.choices?.map((choice, choice_index) => <option key={choice_index} value={choice_index}>{choice.label} (+{formatINR(choice.price)})</option>)}
              </select>
            </> : <FloatingInput id={id} label={`${option.label}${option.required ? ' (required)' : ' (optional)'}`} type="text" required={option.required} value={String(answers[key] ?? '')} onChange={(event) => set_answer(key, event.target.value)} />}
          </div>;
        })}
        {item.pwyw && <>
          <FloatingInput id="buy_amount" label="Unit amount (INR, optional)" inputMode="decimal" value={amount} onChange={(event) => set_amount(event.target.value)} />
          <p className={stat_classes.sub}>Minimum including options: {formatINR(minimum)}. Leave blank to pay the minimum.</p>
        </>}
        {!owner && <>
          <FloatingInput id="buy_discount" label="Discount code (optional)" value={discount_code} onChange={(event) => set_discount_code(event.target.value)} />
          <FloatingInput id="buy_gift" label="Gift recipient username (optional)" value={gift_to} onChange={(event) => set_gift_to(event.target.value)} />
        </>}
        <div className={`${stat_classes.card} mt-2 ${utility_classes.mt_2}`}><span className={stat_classes.label}>{discount_code.trim() ? 'Before discount' : 'Total'}</span><span className={stat_classes.value}>{Number.isFinite(total) ? formatINR(total) : 'Enter a valid amount and quantity'}</span></div>
        {validation && <p className={`muted ${utility_classes.muted}`}>{validation}</p>}
        {owner ? <p className={`muted ${utility_classes.muted}`}>You can't purchase this item because it is yours</p> : <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>{auth ? <button disabled={!!validation}>Review purchase</button>
          : <Link className="btn" to="/i/flow/login" state={{ from: location }}>Sign in to buy</Link>}</div>}
        <ItemReviews id={item.id} auth={auth} />
      </form>}
    </div>
  </Modal>;
}
