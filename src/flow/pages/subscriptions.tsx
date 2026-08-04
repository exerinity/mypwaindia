import { ContentSkeleton } from '../../components/app_skeleton.tsx';
import { useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useCachedQuery } from '../../hooks/cached_query.js';
import { useRefreshTimer } from '../../hooks/refresh_timer.js';
import { usePageTitle } from '../../hooks/page_title.js';
import { useSettings } from '../../context/settings_ctx.tsx';
import { listSubscriptions, cancelSubscription, resumeSubscription } from '../../api/subscriptions.js';
import { Skeleton, ErrorBox, Empty } from '../../components/status.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';

const RefreshStatus = lazy(() => import('../../components/refresh_status.tsx').then((m) => ({ default: m.RefreshStatus })));
const ConfirmModal = lazy(() => import('../../components/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));

interface Subscription {
  subscription_id: string;
  plan_name: string;
  business_name: string;
  amount: number;
  interval: string;
  interval_count: number;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
  cancelled_at: string | null;
  created_at: string;
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'trialing', label: 'Trialing' },
  { value: 'past_due', label: 'Past due' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
];

function formatInterval(interval: string, count: number) {
  const base = interval.replace(/ly$/, '');
  if (count <= 1) return `every ${base}`;
  return `every ${count} ${base}s`;
}

export default function SubscriptionsPage() {
  usePageTitle('Subscriptions');
  const { active } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [filter, setFilter] = useState('');
  const [cancelTarget, setCancelTarget] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const moneyMod = useLazyModule(() => import('../../utils/money.js'));
  const datesMod = useLazyModule(() => import('../../utils/dates.js'));
  const formatINR = (n: number) => moneyMod ? moneyMod.formatINR(n) : '...';
  const formatDateShort = (d: string) => datesMod ? datesMod.formatDateShort(d) : '...';

  const subsQ = useCachedQuery<{ subscriptions: Subscription[] }>(
    active ? `subs:${active.id}:${filter || 'all'}` : null,
    () => listSubscriptions(active!, filter || undefined) as Promise<{ subscriptions: Subscription[] }>,
    [active?.token, filter],
    { skip: !active }
  );

  const { secondsLeft, refreshNow } = useRefreshTimer(
    [subsQ.refetch],
    { enabled: settings.autoRefresh && !!active }
  );

  const subscriptions = useMemo(() => subsQ.data?.subscriptions ?? [], [subsQ.data]);

  async function doCancel(sub: Subscription) {
    setBusy(sub.subscription_id);
    try {
      await cancelSubscription(active!, sub.subscription_id);
      toast.success(`OK, ${sub.plan_name} will end on ${formatDateShort(sub.current_period_end)}.`);
      subsQ.refetch();
    } catch (e) {
      const { describeError } = await import('../../utils/errors.js');
      toast.error(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  async function doResume(sub: Subscription) {
    setBusy(sub.subscription_id);
    try {
      await resumeSubscription(active!, sub.subscription_id);
      toast.success(`OK, ${sub.plan_name} will keep renewing.`);
      subsQ.refetch();
    } catch (e) {
      const { describeError } = await import('../../utils/errors.js');
      toast.error(describeError(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <h1 className="mt-0">Subscriptions</h1>

      <div className="sub-filters mb-2">
        {FILTERS.map((f) => (
          <button
            key={f.value || 'all'}
            type="button"
            className={`compact ${filter === f.value ? '' : 'secondary'}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {subsQ.loading && !subsQ.data ? (
        <div className="grid" style={{ gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card sub-card compact">
              <div className="sub-info">
                <div className="row gap-sm" style={{ marginBottom: 6 }}>
                  <Skeleton width={140} height={16} />
                  <Skeleton width={52} height={16} radius={999} />
                </div>
                <Skeleton width={`${120 + (i % 2) * 40}px`} height={11} style={{ marginBottom: 4 }} />
                <Skeleton width={200} height={10} />
              </div>
              <Skeleton width={82} height={30} radius={6} />
            </div>
          ))}
        </div>
      ) :
        subsQ.error ? <ErrorBox error={subsQ.error} /> :
          subscriptions.length === 0 ? <Empty>No subscriptions{filter ? ` with ${filter}` : ''}</Empty> :
            <div className="grid" style={{ gap: 10 }}>
              {subscriptions.map((s) => {
                const pending = s.cancel_at_period_end;
                const canCancel = !pending && ['active', 'trialing', 'past_due'].includes(s.status);
                const working = busy === s.subscription_id;
                return (
                  <div key={s.subscription_id} className="card sub-card compact">
                    <div className="sub-info">
                      <div className="row gap-sm" style={{ alignItems: 'center' }}>
                        <strong>{s.plan_name}</strong>
                        <span className={`link-status ${s.status}`}>{s.status.replace('_', ' ')}</span>
                      </div>
                      <div className="muted">{s.business_name}</div>
                      <div>{formatINR(s.amount)} ({formatInterval(s.interval, s.interval_count)})</div>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>
                        Current period: {formatDateShort(s.current_period_start)} to {formatDateShort(s.current_period_end)}
                      </div>
                      {pending && (
                        <div className="muted" style={{ fontSize: '0.78rem' }}>
                          Cancels on {formatDateShort(s.current_period_end)}
                        </div>
                      )}
                    </div>
                    <div className="row gap-sm">
                      {pending ? (
                        <button className="compact" onClick={() => doResume(s)} disabled={working}>
                          {working ? <><span className="spinner" /> Resuming...</> : 'Resume'}
                        </button>
                      ) : canCancel ? (
                        <button className="compact danger" onClick={() => setCancelTarget(s)} disabled={working}>
                          {working ? <><span className="spinner" /> Cancelling...</> : 'Cancel'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
      }

      <RefreshStatus seconds={secondsLeft} onRefresh={refreshNow} enabled={settings.autoRefresh} />

      <ConfirmModal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={() => {
          if (cancelTarget) doCancel(cancelTarget);
          setCancelTarget(null);
        }}
        title={cancelTarget?.plan_name ?? ''}
        message={cancelTarget
          ? <>Cancel <strong>{cancelTarget.plan_name}</strong>? It stays active until {formatDateShort(cancelTarget.current_period_end)}, then won't renew. You can restore it at any time before then.</>
          : ''}
      />
    </Suspense>
  );
}
