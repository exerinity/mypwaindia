import type { ShopItem, ShopOrder } from '../api/shop.js';
import type { Profile, ProfileLink, ProfilePatch, ProfileSection, StatusExpiry } from '../api/profile.js';

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

export function country_flag_emoji(value?: string | null): string {
  const country = value?.toUpperCase();
  if (country === 'GB-SCT') return '\u{1f3f4}\u{e0067}\u{e0062}\u{e0073}\u{e0063}\u{e0074}\u{e007f}';
  return country && /^[A-Z]{2}$/.test(country) ? String.fromCodePoint(...Array.from(country, (letter) => letter.charCodeAt(0) + 127397)) : '';
}

export function profile_web_url(username: string) {
  return `https://mypayindia.com/@${encodeURIComponent(username)}`;
}

export function section_title(type: string) {
  return type.split('_').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function profile_patch(profile: Profile, draft: {
  bio: string; visibility: 'public' | 'private'; balance_visible: boolean; links: ProfileLink[]; layout: ProfileSection[];
  personalization: Required<Pick<ProfilePatch, 'pronouns' | 'pride_flags' | 'avatar_flag' | 'avatar_accessory' | 'country' | 'accent'>>;
  status_emoji: string; status_text: string; status_expiry: StatusExpiry; expiry_changed: boolean;
}): ProfilePatch {
  const patch: ProfilePatch = {};
  if (draft.bio !== (profile.bio ?? '')) patch.bio = draft.bio;
  if (draft.visibility !== (profile.visibility === 'private' ? 'private' : 'public')) patch.visibility = draft.visibility;
  if (draft.balance_visible !== (profile.balance_visible ?? false)) patch.balance_visible = draft.balance_visible;
  const personalization = draft.personalization;
  for (const key of ['pronouns', 'avatar_flag', 'avatar_accessory', 'country'] as const) {
    if (personalization[key] !== (profile[key] ?? '')) Object.assign(patch, { [key]: personalization[key] });
  }
  if (personalization.accent !== (profile.accent ?? 'brand')) patch.accent = personalization.accent;
  if (JSON.stringify(personalization.pride_flags) !== JSON.stringify(profile.pride_flags ?? [])) patch.pride_flags = personalization.pride_flags;
  if (draft.status_emoji !== (profile.status?.emoji ?? '') || draft.status_text !== (profile.status?.text ?? '') || draft.expiry_changed) {
    patch.status_emoji = draft.status_emoji;
    patch.status_text = draft.status_text;
    patch.status_expiry = draft.status_expiry;
  }
  const clean_links = draft.links.map(({ platform, url }) => ({ platform, url }));
  if (JSON.stringify(clean_links) !== JSON.stringify((profile.links ?? []).map(({ platform, url }) => ({ platform, url })))) patch.links = clean_links;
  const clean_layout = draft.layout.map(({ type, visible, config }) => ({ type, visible, config }));
  const original_layout = (profile.sections ?? []).map(({ type, visible, config }) => ({ type, visible, config }));
  if (JSON.stringify(clean_layout) !== JSON.stringify(original_layout)) patch.layout = clean_layout;
  return patch;
}

export function order_actions(order: ShopOrder, username: string) {
  const seller = order.side === 'seller' || order.seller?.toLowerCase() === username.toLowerCase();
  const buyer = order.side === 'buyer' || (!order.side && order.buyer?.toLowerCase() === username.toLowerCase());
  return { fulfill: seller && order.status === 'pending', refund: seller && order.status === 'pending', cancel: buyer && order.status === 'in_review' };
}

export function shop_total(item: ShopItem, quantity: number, answers: Record<string, string | number | boolean>, amount?: number) {
  let unit_price = item.price;
  for (const option of item.options ?? []) {
    if (!option.key) continue;
    const answer = answers[option.key];
    if (option.type === 'checkbox' && answer === true) unit_price += option.price ?? 0;
    if (option.type === 'select' && typeof answer === 'number') unit_price += option.choices?.[answer]?.price ?? 0;
  }
  return (item.pwyw && amount !== undefined ? amount : unit_price) * quantity;
}

export function purchase_error(item: ShopItem, quantity: number, answers: Record<string, string | number | boolean>, amount?: number): string | undefined {
  if (!Number.isSafeInteger(quantity) || quantity < 1) return 'Enter a whole quantity of at least 1.';
  if (item.pwyw && quantity !== 1) return 'Pay what you want items must have a quantity of 1.';
  if (item.pwyw && amount !== undefined && (!Number.isSafeInteger(amount) || amount < shop_total(item, 1, answers))) return 'Enter an amount at least the price plus option extras.';
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
