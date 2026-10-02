import { apiFetch } from './client.js';
import type { AuthOpts } from './client.js';

export interface ShopChoice { label: string; price: number }
export interface ShopOption {
  key?: string;
  label: string;
  type: 'checkbox' | 'select' | 'text';
  required: boolean;
  price?: number;
  choices?: ShopChoice[];
}
export interface ShopItem {
  id: number;
  seller: string;
  name: string;
  description?: string;
  image_url?: string | null;
  price: number;
  stock: number | null;
  sold_out?: boolean;
  delivery: 'manual' | 'instant';
  options?: ShopOption[];
  sold?: number;
  created?: string;
  status?: string;
  instant_type?: 'text' | 'url' | 'image' | null;
  instant_content?: string | null;
}
export interface ShopItemBody {
  name: string;
  price: number;
  description?: string;
  stock?: number | null;
  delivery: 'instant' | 'manual';
  instant_type?: 'text' | 'url';
  instant_content?: string;
  hidden?: boolean;
  options?: ShopOption[];
}
export type OrderStatus = 'in_review' | 'pending' | 'fulfilled' | 'refunded';
export interface ShopOrder {
  id: number;
  order_id?: string;
  item_id?: number;
  item_name?: string;
  buyer?: string;
  seller?: string;
  side?: 'buyer' | 'seller';
  quantity?: number;
  unit_price?: number;
  total?: number;
  selections?: { key: string; label: string; value: string | boolean; price: number }[];
  delivery?: 'manual' | 'instant';
  status: OrderStatus;
  delivery_type?: string | null;
  delivery_content?: string | null;
  attachment_url?: string | null;
  transaction_id?: string | null;
  refund_transaction_id?: string | null;
  created?: string;
  fulfilled_at?: string | null;
}
export interface ShopNotification {
  id: number;
  kind: string;
  message: string;
  order_id: number | null;
  read: boolean;
  created: string;
}
export interface OrderPage { orders: ShopOrder[]; page: number; last_page: number }

export function list_shop_items(username: string, auth: Partial<AuthOpts> = {}) {
  return apiFetch<{ items: ShopItem[] }>('/api/v2/shop/items', { ...auth, query: { username } });
}
export function get_shop_item(id: number, auth: Partial<AuthOpts> = {}) {
  return apiFetch<ShopItem>('/api/v2/shop/item', { ...auth, query: { id: String(id) } });
}
export function list_my_shop_items(auth: AuthOpts) {
  return apiFetch<{ items: ShopItem[] }>('/api/v2/shop/my/items', auth);
}
export function create_shop_item(auth: AuthOpts, body: ShopItemBody) {
  return apiFetch<Partial<ShopItem>>('/api/v2/shop/items/create', { ...auth, method: 'POST', body });
}
export function update_shop_item(auth: AuthOpts, id: number, body: Partial<ShopItemBody>) {
  return apiFetch<Partial<ShopItem>>('/api/v2/shop/items/update', { ...auth, method: 'POST', body: { ...body, id } });
}
export function restock_shop_item(auth: AuthOpts, id: number, stock: number | null, hidden?: boolean) {
  return apiFetch<Partial<ShopItem>>('/api/v2/shop/items/restock', {
    ...auth, method: 'POST', body: { id, stock, ...(hidden === undefined ? {} : { hidden }) },
  });
}
export function archive_shop_item(auth: AuthOpts, id: number) {
  return apiFetch('/api/v2/shop/items/archive', { ...auth, method: 'POST', body: { id } });
}
export function buy_shop_item(auth: AuthOpts, item_id: number, quantity: number, options: Record<string, string | number | boolean>) {
  return apiFetch<ShopOrder>('/api/v2/shop/buy', { ...auth, method: 'POST', body: { item_id, quantity, options } });
}
export function list_shop_orders(auth: AuthOpts, side: 'orders' | 'purchases', page = 1, status?: OrderStatus) {
  return apiFetch<OrderPage>(`/api/v2/shop/${side}`, {
    ...auth, query: { page: String(page), ...(status ? { status } : {}) },
  });
}
export function get_shop_order(auth: AuthOpts, id: number) {
  return apiFetch<ShopOrder>('/api/v2/shop/order', { ...auth, query: { id: String(id) } });
}
export function fulfill_shop_order(auth: AuthOpts, id: number, type: 'text' | 'url', content: string) {
  return apiFetch<ShopOrder>('/api/v2/shop/orders/fulfill', { ...auth, method: 'POST', body: { id, type, content } });
}
export function refund_shop_order(auth: AuthOpts, id: number) {
  return apiFetch<ShopOrder>('/api/v2/shop/orders/refund', { ...auth, method: 'POST', body: { id } });
}
export function cancel_shop_purchase(auth: AuthOpts, id: number) {
  return apiFetch<ShopOrder>('/api/v2/shop/purchases/cancel', { ...auth, method: 'POST', body: { id } });
}
export function list_shop_notifications(auth: AuthOpts, page = 1) {
  return apiFetch<{ unread: number; notifications: ShopNotification[]; page: number; last_page: number }>(
    '/api/v2/shop/notifications', { ...auth, query: { page: String(page) } },
  );
}
export function read_shop_notifications(auth: AuthOpts) {
  return apiFetch('/api/v2/shop/notifications/read', { ...auth, method: 'POST' });
}
