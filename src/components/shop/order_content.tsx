import { utility_classes } from '../../styles/utils.stylex.ts';
import { profile_classes } from '../../styles/profiles.stylex.ts';
import { alert_classes } from '../../styles/alerts.stylex.ts';
import type { ShopOrder } from '../../api/shop.js';
import { safe_http_url } from '../../utils/profiles.ts';

export function OrderContent({ order }: { order: ShopOrder }) {
  if (order.status === 'in_review') return <div className={`alert alert-warning ${alert_classes.warning}`}>Payment is under review. Delivery will be available after staff approve it{order.side === 'buyer' && ' You can cancel this purchase for a full refund in the interim.'}</div>;
  if (order.status === 'pending') return <div className={`alert alert-info ${alert_classes.info}`}>Payment completed. Your order is waiting for the seller to deliver it</div>;
  if (order.status === 'refunded') return <div className={`alert alert-info ${alert_classes.info}`}>This order was refunded</div>;
  if (order.status !== 'fulfilled') return null;
  if (order.recipient && order.side !== 'seller' && order.side !== 'recipient') return <div className={`alert alert-info ${alert_classes.info}`}>This gift was delivered to @{order.recipient}. Only the recipient and seller can see its delivery.</div>;
  const delivery_url = order.delivery_type === 'url' ? safe_http_url(order.delivery_content) : undefined;
  const attachment_url = safe_http_url(order.attachment_url);
  return <div className={`mt-2 ${utility_classes.mt_2}`}>
    <h3 className={`mt-0 ${utility_classes.mt_0}`}>Delivery</h3>
    {delivery_url ? <a href={delivery_url} target="_blank" rel="noopener noreferrer">Open your delivery</a>
      : order.delivery_content && <p className={`profile_prose ${profile_classes.prose}`}>{order.delivery_content}</p>}
    {attachment_url && <p><a href={attachment_url} target="_blank" rel="noopener noreferrer">Open attachment on MyPayIndia</a></p>}
  </div>;
}
