import { useEffect, useRef, useState } from 'react';
import type { FlowTaskInput, FlowTaskResponse, ShopItemEditorSubtask } from '../api/flow.ts';
import type { ShopItemBody, ShopOption } from '../api/shop.js';
import { ErrorBox } from '../components/ui/status.tsx';
import { FloatingInput, FloatingTextarea } from '../components/ui/floating_input.tsx';
import { rupeesToPaisa } from '../utils/money.js';
import { safe_http_url } from '../utils/profiles.ts';
import { useToast } from '../context/toast_ctx.tsx';

export default function EditItemModal({ subtask, on_submit, on_complete, on_busy }: {
  subtask: ShopItemEditorSubtask; on_submit: (input: FlowTaskInput) => Promise<FlowTaskResponse>; on_complete: () => void; on_busy: (value: boolean) => void;
}) {
  const data = subtask.shop_item_editor;
  const item = data.item;
  const labels = data.labels;
  const save_action = data.actions.find((action) => action.link_id === 'save' && action.link_type === 'task');
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
    if (busy || !save_action) return;
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
      await on_submit({ subtask_id: subtask.subtask_id, action_id: save_action.link_id, values: { id: item?.id ?? null, fields: body } });
      toast.success(data.success_text.text);
      on_complete();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); on_busy(false); }
  }

  return <form onSubmit={save}>
    <ErrorBox error={error} />
    <fieldset disabled={busy} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <FloatingInput id="item_name" label={labels.name} type="text" maxLength={data.limits.name} required value={name} onChange={(event) => set_name(event.target.value)} />
      <FloatingTextarea id="item_description" label={labels.description} maxLength={data.limits.description} value={description} onChange={(event) => set_description(event.target.value)} />
      <FloatingInput id="item_price" label={labels.price} type="text" inputMode="decimal" required value={price} onChange={(event) => set_price(event.target.value)} />
      <FloatingInput id="item_stock" label={labels.stock} type="number" min={0} step={1} value={stock} onChange={(event) => set_stock(event.target.value)} />
      <label className="checkbox-row"><input type="checkbox" checked={hidden} onChange={(event) => set_hidden(event.target.checked)} />{labels.hidden}</label>
      {image_delivery ? <p className="muted">{data.image_delivery_text.text}</p> : <>
        <label htmlFor="item_delivery">{labels.delivery}</label><select id="item_delivery" value={delivery} onChange={(event) => set_delivery(event.target.value as 'instant' | 'manual')}>
          {data.delivery_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        {delivery === 'instant' && <>
          <label htmlFor="instant_type">{labels.instant_type}</label><select id="instant_type" value={instant_type} onChange={(event) => set_instant_type(event.target.value as 'text' | 'url')}>
            {data.instant_options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <FloatingTextarea id="instant_content" label={labels.instant_content} required value={instant_content} onChange={(event) => set_instant_content(event.target.value)} />
        </>}
      </>}
      <OptionsEditor data={data} options={options} on_change={set_options} />
      <div className="btn-row mt-2"><button disabled={busy || !name.trim() || !save_action}>{busy ? save_action?.pending_label : save_action?.label}</button></div>
    </fieldset>
  </form>;
}

function OptionsEditor({ data, options, on_change }: { data: ShopItemEditorSubtask['shop_item_editor']; options: ShopOption[]; on_change: (options: ShopOption[]) => void }) {
  const labels = data.labels;
  function update_option(index: number, patch: Partial<ShopOption>) {
    on_change(options.map((option, current) => current === index ? { ...option, ...patch } : option));
  }
  return <div className="mt-2 mb-2">
    <h3 className="mt-0">{labels.buyer_fields}</h3>
    {options.map((option, index) => <div key={index} className="card compact mb-2">
      <FloatingInput id={`option_label_${index}`} label={labels.option_label} type="text" required value={option.label} onChange={(event) => update_option(index, { label: event.target.value })} />
      <label htmlFor={`option_type_${index}`}>{labels.option_type}</label><select id={`option_type_${index}`} value={option.type} onChange={(event) => {
        const type = event.target.value as ShopOption['type'];
        const next: ShopOption = { ...(option.key ? { key: option.key } : {}), label: option.label, required: option.required, type };
        if (type === 'select') next.choices = [{ label: '', price: 0 }];
        if (type === 'checkbox') next.price = 0;
        on_change(options.map((current, current_index) => current_index === index ? next : current));
      }}>{data.option_types.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
      <label className="checkbox-row"><input type="checkbox" checked={option.required} onChange={(event) => update_option(index, { required: event.target.checked })} />{labels.required}</label>
      {option.type === 'checkbox' && <OptionPrice id={`option_price_${index}`} label={labels.extra_price} value={option.price ?? 0} on_change={(price) => update_option(index, { price })} />}
      {option.type === 'select' && <>
        {(option.choices ?? []).map((choice, choice_index) => <div className="mb-2" key={choice_index}>
          <FloatingInput id={`choice_${index}_${choice_index}`} label={labels.choice_label} type="text" required value={choice.label}
            onChange={(event) => update_option(index, { choices: option.choices?.map((current, current_index) => current_index === choice_index ? { ...current, label: event.target.value } : current) })} />
          <OptionPrice id={`choice_price_${index}_${choice_index}`} label={labels.extra_price} value={choice.price} on_change={(price) => update_option(index, { choices: option.choices?.map((current, current_index) => current_index === choice_index ? { ...current, price } : current) })} />
          <div className="btn-row"><button className="secondary" type="button" onClick={() => update_option(index, { choices: option.choices?.filter((_, current) => current !== choice_index) })}>{labels.remove_choice}</button></div>
        </div>)}
        <div className="btn-row"><button className="secondary" type="button" onClick={() => update_option(index, { choices: [...(option.choices ?? []), { label: '', price: 0 }] })}>{labels.add_choice}</button></div>
      </>}
      <div className="btn-row"><button className="secondary" type="button" onClick={() => on_change(options.filter((_, current) => current !== index))}>{labels.remove_field}</button></div>
    </div>)}
    <div className="btn-row"><button className="secondary" type="button" onClick={() => on_change([...options, { label: '', type: 'text', required: false }])}>{labels.add_field}</button></div>
  </div>;
}

function OptionPrice({ id, label, value, on_change }: { id: string; label: string; value: number; on_change: (value: number) => void }) {
  const [price, set_price] = useState(Number.isFinite(value) ? (value / 100).toFixed(2) : '');
  const last_value = useRef(value);
  useEffect(() => {
    if (Object.is(value, last_value.current)) return;
    last_value.current = value;
    set_price(Number.isFinite(value) ? (value / 100).toFixed(2) : '');
  }, [value]);
  return <FloatingInput id={id} label={label} type="text" inputMode="decimal" required value={price} onChange={(event) => {
    const next_value = rupeesToPaisa(event.target.value);
    last_value.current = next_value;
    set_price(event.target.value);
    on_change(next_value);
  }} />;
}
