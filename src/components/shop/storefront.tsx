import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { card_classes } from '../../styles/cards.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { stat_classes } from '../../styles/stats.stylex.ts';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AuthOpts } from '../../api/client.js';
import { list_saved_items, list_shop_items, toggle_saved_item } from '../../api/shop.js';
import type { ShopListing } from '../../api/shop.js';
import { use_profile_resource } from '../../hooks/profile_resource.ts';
import { Empty, ErrorBox, LoadingRow } from '../ui/status.tsx';
import { safe_http_url } from '../../utils/profiles.ts';
import { formatINR } from '../../utils/money.js';

export function ProfileShop({ username, auth, owner, show_manage_link = true }: { username: string; auth?: AuthOpts; owner: boolean; show_manage_link?: boolean }) {
  return <ShopCatalog username={username} auth={auth} owner={owner} show_manage_link={show_manage_link} />;
}

export function SavedShopItems({ auth }: { auth: AuthOpts }) {
  return <ShopCatalog auth={auth} saved />;
}

function ShopCatalog({ username, auth, owner = false, saved = false, show_manage_link = true }: { username?: string; auth?: AuthOpts; owner?: boolean; saved?: boolean; show_manage_link?: boolean }) {
  const resource = use_profile_resource<{ items: ShopListing[] }>(() => saved && auth ? list_saved_items(auth) : list_shop_items(username ?? '', auth), `${saved}:${username}:${auth?.env}:${auth?.token}`);
  const saved_resource = use_profile_resource(() => auth && !saved ? list_saved_items(auth) : Promise.resolve({ items: [] }), `${saved}:${auth?.env}:${auth?.token}`);
  const location = useLocation();
  const [saving, set_saving] = useState<number | null>(null);
  const [save_error, set_save_error] = useState<unknown>(null);
  const saved_ids = new Set((saved ? resource : saved_resource).data?.items.map((item) => item.id) ?? []);
  useEffect(() => {
    window.addEventListener('shop_items_updated', resource.reload);
    return () => window.removeEventListener('shop_items_updated', resource.reload);
  }, [resource.reload]);
  async function save_item(id: number) {
    if (!auth || saving !== null) return;
    set_saving(id);
    set_save_error(null);
    try { await toggle_saved_item(auth, id); if (saved) resource.reload(); else saved_resource.reload(); }
    catch (error) { set_save_error(error); }
    finally { set_saving(null); }
  }
  return <div>
    {owner && show_manage_link && <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><Link to="/account/shop" className="btn secondary">Manage shop</Link></div>}
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
            <Link className="btn secondary" to={`/i/flow/shop/${item.id}`} state={{ backgroundLocation: location }}>{owner ? 'View item' : 'View and buy'}</Link>
            {auth && !owner && <button className="secondary" disabled={saving !== null || (!saved && !saved_resource.data)} aria-pressed={saved_ids.has(item.id)} onClick={() => save_item(item.id)}>{saved_ids.has(item.id) ? 'Remove saved item' : 'Save item'}</button>}
          </div>
        </article>;
      })}
    </div>
  </div>;
}
