import { useEffect, useRef, useState } from 'react';
import type { AuthOpts } from '../api/client.js';
import { create_shop_item, get_shop_item, update_shop_item } from '../api/shop.js';
import type { ShopItem, ShopItemBody, ShopOption } from '../api/shop.js';
import { use_profile_resource } from '../hooks/profile_resource.ts';
import { ErrorBox, LoadingRow } from '../components/ui/status.tsx';
import { FloatingInput, FloatingTextarea } from '../components/ui/floating_input.tsx';
import { rupeesToPaisa } from '../utils/money.js';
import { safe_http_url } from '../utils/profiles.ts';
import { useToast } from '../context/toast_ctx.tsx';

export default function EditItemModal({ id, auth, on_save, on_busy }: {
  id: number | null; auth: AuthOpts; on_save: () => void; on_busy: (value: boolean) => void;
}) {
  const resource = use_profile_resource(() => id === null ? Promise.resolve(null) : get_shop_item(id, auth), `${id}:${auth.env}:${auth.token}`);
  return <>
    <ErrorBox error={resource.error} />
    {!!resource.error && <div className="btn-row"><button className="secondary" onClick={resource.reload}>Retry</button></div>}
    {resource.loading ? <LoadingRow /> : !resource.error && <ItemForm item={resource.data} auth={auth} on_save={on_save} on_busy={on_busy} />}
  </>;
}

function ItemForm({ item, auth, on_save, on_busy }: { item: ShopItem | null; auth: AuthOpts; on_save: () => void; on_busy: (value: boolean) => void }) {
  const [name, set_name] = useState(item?.name ?? '');
  const [description, set_description] = useState(item?.description ?? '');
  const [price, set_price] = useState(item ? (item.price / 100).toFixed(2) : '');
  const [stock, set_stock] = useState(item?.stock == null ? '' : String(item.stock));
  const [hidden, set_hidden] = useState(item?.status === 'hidden');
  const [delivery, set_delivery] = useState<'instant' | 'manual'>(item?.delivery ?? 'manual');
  const [instant_type, set_instant_type] = useState<'text' | 'url'>(item?.instant_type === 'url' ? 'url' : 'text');
  const [instant_content, set_instant_content] = useState(item?.instant_content ?? '');
  const [options, set_options] = useState<ShopOption[]>(item?.options ?? []);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();
  const image_delivery = item?.instant_type === 'image';

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const paisa = rupeesToPaisa(price);
    const stock_value = stock.trim() ? Number(stock) : null;
    if (!Number.isSafeInteger(paisa) || paisa < 0) { set_error(new Error('Enter a nonnegative price with at most two decimal places.')); return; }
    if (stock_value !== null && (!Number.isSafeInteger(stock_value) || stock_value < 0)) { set_error(new Error('Stock must be a nonnegative whole number, or blank for unlimited.')); return; }
    if (delivery === 'instant' && !image_delivery && (!instant_content.trim() || (instant_type === 'url' && !safe_http_url(instant_content)))) {
      set_error(new Error('Enter delivery content, using an http or https URL for URL delivery')); return;
    }
    for (const option of options) {
      if (!option.label.trim() || (option.price !== undefined && (!Number.isSafeInteger(option.price) || option.price < 0)) ||
        (option.type === 'select' && (!option.choices?.length || option.choices.some((choice) => !choice.label.trim() || !Number.isSafeInteger(choice.price) || choice.price < 0)))) {
        set_error(new Error('Give every buyer field and choice a label and a valid nonnegative price')); return;
      }
    }
    const body: Partial<ShopItemBody> = { name: name.trim(), description, price: paisa, stock: stock_value, hidden, options };
    if (!image_delivery) {
      body.delivery = delivery;
      if (delivery === 'instant') { body.instant_type = instant_type; body.instant_content = instant_content; }
    }
    if (item) {
      if (body.name === item.name) delete body.name;
      if (body.description === (item.description ?? '')) delete body.description;
      if (body.price === item.price) delete body.price;
      if (body.stock === item.stock) delete body.stock;
      if (hidden === (item.status === 'hidden')) delete body.hidden;
      if (JSON.stringify(options) === JSON.stringify(item.options ?? [])) delete body.options;
      if (body.delivery === item.delivery) delete body.delivery;
      if (body.instant_type === item.instant_type) delete body.instant_type;
      if (body.instant_content === item.instant_content) delete body.instant_content;
    }
    if (!Object.keys(body).length) { toast.info('No changes to save'); return; }
    set_busy(true);
    on_busy(true);
    set_error(null);
    try {
      if (item) await update_shop_item(auth, item.id, body);
      else await create_shop_item(auth, body as ShopItemBody);
      toast.success(item ? 'Item saved' : 'Item created');
      on_save();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); on_busy(false); }
  }

  return <form onSubmit={save}>
    <ErrorBox error={error} />
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <FloatingInput id="item_name" label="Name" type="text" maxLength={100} required value={name} onChange={(event) => set_name(event.target.value)} />
      <FloatingTextarea id="item_description" label="Description" maxLength={2000} value={description} onChange={(event) => set_description(event.target.value)} />
      <FloatingInput id="item_price" label="Unit price (INR)" type="text" inputMode="decimal" required value={price} onChange={(event) => set_price(event.target.value)} />
      <FloatingInput id="item_stock" label="Stock (blank for unlimited)" type="number" min={0} step={1} value={stock} onChange={(event) => set_stock(event.target.value)} />
      <label className="checkbox-row"><input type="checkbox" checked={hidden} onChange={(event) => set_hidden(event.target.checked)} />Hide from my profile</label>
      {image_delivery ? <p className="muted">This item uses image delivery. Manage its delivery on MyPayIndia.com</p> : <>
        <label htmlFor="item_delivery">Delivery</label><select id="item_delivery" value={delivery} onChange={(event) => set_delivery(event.target.value as 'instant' | 'manual')}>
          <option value="manual">Manual</option><option value="instant">Instant</option>
        </select>
        {delivery === 'instant' && <>
          <label htmlFor="instant_type">Delivery type</label><select id="instant_type" value={instant_type} onChange={(event) => set_instant_type(event.target.value as 'text' | 'url')}>
            <option value="text">Text</option><option value="url">URL</option>
          </select>
          <FloatingTextarea id="instant_content" label="Content delivered to buyers" required value={instant_content} onChange={(event) => set_instant_content(event.target.value)} />
        </>}
      </>}
      <OptionsEditor options={options} on_change={set_options} />
      <div className="btn-row mt-2"><button disabled={busy || !name.trim()}>{busy ? 'Saving...' : 'Save item'}</button></div>
    </fieldset>
  </form>;
}

function OptionsEditor({ options, on_change }: { options: ShopOption[]; on_change: (options: ShopOption[]) => void }) {
  function update_option(index: number, patch: Partial<ShopOption>) {
    on_change(options.map((option, current) => current === index ? { ...option, ...patch } : option));
  }
  return <div className="mt-2 mb-2">
    <h3 className="mt-0">Buyer fields</h3>
    {options.map((option, index) => <div key={index} className="card compact mb-2">
      <FloatingInput id={`option_label_${index}`} label="Label" type="text" required value={option.label} onChange={(event) => update_option(index, { label: event.target.value })} />
      <label htmlFor={`option_type_${index}`}>Type</label><select id={`option_type_${index}`} value={option.type} onChange={(event) => {
        const type = event.target.value as ShopOption['type'];
        const next: ShopOption = { ...(option.key ? { key: option.key } : {}), label: option.label, required: option.required, type };
        if (type === 'select') next.choices = [{ label: '', price: 0 }];
        if (type === 'checkbox') next.price = 0;
        on_change(options.map((current, current_index) => current_index === index ? next : current));
      }}><option value="text">Text</option><option value="checkbox">Checkbox</option><option value="select">Select</option></select>
      <label className="checkbox-row"><input type="checkbox" checked={option.required} onChange={(event) => update_option(index, { required: event.target.checked })} />Required</label>
      {option.type === 'checkbox' && <OptionPrice id={`option_price_${index}`} value={option.price ?? 0} on_change={(price) => update_option(index, { price })} />}
      {option.type === 'select' && <>
        {(option.choices ?? []).map((choice, choice_index) => <div className="mb-2" key={choice_index}>
          <FloatingInput id={`choice_${index}_${choice_index}`} label="Choice label" type="text" required value={choice.label}
            onChange={(event) => update_option(index, { choices: option.choices?.map((current, current_index) => current_index === choice_index ? { ...current, label: event.target.value } : current) })} />
          <OptionPrice id={`choice_price_${index}_${choice_index}`} value={choice.price} on_change={(price) => update_option(index, { choices: option.choices?.map((current, current_index) => current_index === choice_index ? { ...current, price } : current) })} />
          <div className="btn-row"><button className="secondary" type="button" onClick={() => update_option(index, { choices: option.choices?.filter((_, current) => current !== choice_index) })}>Remove choice</button></div>
        </div>)}
        <div className="btn-row"><button className="secondary" type="button" onClick={() => update_option(index, { choices: [...(option.choices ?? []), { label: '', price: 0 }] })}>Add choice</button></div>
      </>}
      <div className="btn-row"><button className="secondary" type="button" onClick={() => on_change(options.filter((_, current) => current !== index))}>Remove field</button></div>
    </div>)}
    <div className="btn-row"><button className="secondary" type="button" onClick={() => on_change([...options, { label: '', type: 'text', required: false }])}>Add buyer field</button></div>
  </div>;
}

function OptionPrice({ id, value, on_change }: { id: string; value: number; on_change: (value: number) => void }) {
  const [price, set_price] = useState(Number.isFinite(value) ? (value / 100).toFixed(2) : '');
  const last_value = useRef(value);
  useEffect(() => {
    if (Object.is(value, last_value.current)) return;
    last_value.current = value;
    set_price(Number.isFinite(value) ? (value / 100).toFixed(2) : '');
  }, [value]);
  return <FloatingInput id={id} label="Extra price (INR)" type="text" inputMode="decimal" required value={price} onChange={(event) => {
    const next_value = rupeesToPaisa(event.target.value);
    last_value.current = next_value;
    set_price(event.target.value);
    on_change(next_value);
  }} />;
}
