import type { ShopItem, ShopOrder } from '../api/shop.js';
import type { Profile, ProfileLink, ProfilePatch, ProfileSection } from '../api/profile.js';

export function safe_http_url(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' || url.protocol === 'http:') return url.href;
  } catch {}
  return undefined;
}

export function profile_path(username: string) {
  return `/i/profile/${encodeURIComponent(username)}`;
}

export function profile_web_url(username: string) {
  return `https://mypayindia.com/@${encodeURIComponent(username)}`;
}

export function section_title(type: string) {
  return type.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function profile_patch(profile: Profile, draft: {
  bio: string; visibility: 'public' | 'private'; balance_visible: boolean; links: ProfileLink[]; layout: ProfileSection[];
}): ProfilePatch {
  const patch: ProfilePatch = {};
  if (draft.bio !== (profile.bio ?? '')) patch.bio = draft.bio;
  if (draft.visibility !== (profile.visibility === 'private' ? 'private' : 'public')) patch.visibility = draft.visibility;
  if (draft.balance_visible !== (profile.balance_visible ?? false)) patch.balance_visible = draft.balance_visible;
  const clean_links = draft.links.map(({ platform, url }) => ({ platform, url }));
  if (JSON.stringify(clean_links) !== JSON.stringify((profile.links ?? []).map(({ platform, url }) => ({ platform, url })))) patch.links = clean_links;
  const clean_layout = draft.layout.map(({ type, visible, config }) => ({ type, visible, config }));
  const original_layout = (profile.sections ?? []).map(({ type, visible, config }) => ({ type, visible, config }));
  if (JSON.stringify(clean_layout) !== JSON.stringify(original_layout)) patch.layout = clean_layout;
  return patch;
}

export function order_actions(order: ShopOrder, username: string) {
  const seller = order.side === 'seller' || order.seller?.toLowerCase() === username.toLowerCase();
  const buyer = order.side === 'buyer' || order.buyer?.toLowerCase() === username.toLowerCase();
  return { fulfill: seller && order.status === 'pending', refund: seller && order.status === 'pending', cancel: buyer && order.status === 'in_review' };
}

export function shop_total(item: ShopItem, quantity: number, answers: Record<string, string | number | boolean>) {
  let unit_price = item.price;
  for (const option of item.options ?? []) {
    if (!option.key) continue;
    const answer = answers[option.key];
    if (option.type === 'checkbox' && answer === true) unit_price += option.price ?? 0;
    if (option.type === 'select' && typeof answer === 'number') unit_price += option.choices?.[answer]?.price ?? 0;
  }
  return unit_price * quantity;
}

export function purchase_error(item: ShopItem, quantity: number, answers: Record<string, string | number | boolean>): string | undefined {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return 'Enter a whole quantity of at least 1.';
  if (item.sold_out || (item.stock != null && quantity > item.stock)) return 'There is not enough stock for this quantity!';
  for (const option of item.options ?? []) {
    if (!option.key) return 'This item has an unsupported buyer field. Please buy it on MyPayIndia.com';
    const answer = answers[option.key];
    if (option.required && (answer === undefined || answer === false || (typeof answer === 'string' && !answer.trim()))) {
      return `Complete ${option.label}.`;
    }
    if (option.type === 'select' && answer !== undefined &&
      (typeof answer !== 'number' || !Number.isInteger(answer) || !option.choices?.[answer])) return `Choose a valid ${option.label}.`;
  }
  if (!Number.isSafeInteger(shop_total(item, quantity, answers))) return 'The total is too large.';
  return undefined;
}
