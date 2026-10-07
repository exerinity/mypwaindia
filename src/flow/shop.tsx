import { utility_classes } from '../styles/utils.stylex.ts';
import { profile_classes } from '../styles/profiles.stylex.ts';
import { button_classes } from '../styles/buttons.stylex.ts';
import { form_classes } from '../styles/forms.stylex.ts';
import { stat_classes } from '../styles/stats.stylex.ts';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { FlowTaskInput, FlowTaskResponse, ShopCheckoutSubtask } from '../api/flow.ts';
import type { AuthOpts } from '../api/client.js';
import type { ShopOrder } from '../api/shop.js';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { ErrorBox } from '../components/ui/status.tsx';
import { FloatingInput } from '../components/ui/floating_input.tsx';
import { OrderContent } from '../components/shop/order_content.tsx';
import { ItemReviews } from '../components/shop/reviews.tsx';
import { shop_total, purchase_error } from '../utils/profiles.ts';
import { formatINR, rupeesToPaisa } from '../utils/money.js';

export default function ShopCheckoutModal({ subtask, auth, on_submit, on_busy, on_receipt }: {
  subtask: ShopCheckoutSubtask; auth?: AuthOpts & { username: string }; on_submit: (input: FlowTaskInput) => Promise<FlowTaskResponse>; on_busy: (value: boolean) => void; on_receipt: () => void;
}) {
  const item = subtask.shop_checkout.item;
  const owner = auth?.username.toLowerCase() === item.seller.toLowerCase();
  const [quantity, set_quantity] = useState(1);
  const [answers, set_answers] = useState<Record<string, string | number | boolean>>({});
  const [amount, set_amount] = useState('');
  const [discount_code, set_discount_code] = useState('');
  const [gift_to, set_gift_to] = useState('');
  const [confirming, set_confirming] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const [order, set_order] = useState<ShopOrder | null>(subtask.shop_checkout.order);
  const { refetchUserInfo } = useGlobalData();
  const location = useLocation();
  const unit_amount = item.pwyw && amount.trim() ? rupeesToPaisa(amount) : undefined;
  const total = shop_total(item, quantity, answers, unit_amount);
  const minimum = shop_total(item, 1, answers);
  const recipient = gift_to.trim().replace(/^@/, '');
  const validation = purchase_error(item, quantity, answers, unit_amount) ?? (gift_to.trim() && !recipient ? 'Enter a gift recipient username.' : undefined);
  const buy_action = subtask.shop_checkout.actions.find((action) => action.link_type === 'task' && action.link_id === 'buy');

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
    on_busy(true);
    set_error(null);
    try {
      const response = await on_submit({ subtask_id: subtask.subtask_id, action_id: 'buy', values: {
        item_id: item.id, quantity, options: answers,
        ...(discount_code.trim() ? { discount_code: discount_code.trim() } : {}), ...(recipient ? { gift_to: recipient } : {}),
        ...(unit_amount === undefined ? {} : { amount: unit_amount }),
      } });
      const receipt = response.subtasks.find((candidate): candidate is ShopCheckoutSubtask => candidate.type === 'shop_checkout');
      if (!receipt?.shop_checkout.order) throw new Error('Check your purchases before retrying. The order receipt could not be loaded.');
      set_order(receipt.shop_checkout.order);
      on_receipt();
      refetchUserInfo().catch(() => {});
      window.dispatchEvent(new Event('shop_items_updated'));
    } catch (next_error) { set_error(next_error); set_confirming(false); }
    finally { set_busy(false); on_busy(false); }
  }

  return <>
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
          <button disabled={busy || !buy_action} onClick={buy}>{busy ? buy_action?.pending_label : `${discount_code.trim() ? 'Pay up to' : buy_action?.label ?? 'Pay'} ${formatINR(total)}`}</button>
          <button className="secondary" disabled={busy} onClick={() => set_confirming(false)}>Back</button>
        </div>
      </> : owner ? <>
        <p className={`profile_prose muted mt-0 ${profile_classes.prose} ${utility_classes.muted} ${utility_classes.mt_0}`}>{item.description}</p>
        <ItemReviews id={item.id} auth={auth} />
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
          <p className={stat_classes.sub}>Minimum including options: {formatINR(minimum)}. Leave blank to pay the minimum</p>
        </>}
        <FloatingInput id="buy_discount" label="Discount code (optional)" value={discount_code} onChange={(event) => set_discount_code(event.target.value)} />
        <FloatingInput id="buy_gift" label="Gift recipient username (optional)" value={gift_to} onChange={(event) => set_gift_to(event.target.value)} />
        <div className={`${stat_classes.card} mt-2 ${utility_classes.mt_2}`}><span className={stat_classes.label}>{discount_code.trim() ? 'Before discount' : 'Total'}</span><span className={stat_classes.value}>{Number.isFinite(total) ? formatINR(total) : 'Enter a valid amount and quantity'}</span></div>
        {validation && <p className={`muted ${utility_classes.muted}`}>{validation}</p>}
        <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}>{auth ? <button disabled={!!validation}>Review purchase</button>
          : <Link className="btn" to="/i/flow/login" state={{ from: location }}>Sign in to buy</Link>}</div>
        <ItemReviews id={item.id} auth={auth} />
      </form>}
    </div>
  </>;
}
