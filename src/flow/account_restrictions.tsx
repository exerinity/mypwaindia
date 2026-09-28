import type { AccountRestrictionsSubtask } from '../api/flow.ts';
import { WarningIcon, SuccessIcon } from '../components/ui/icons.tsx';
import { ErrorBox } from '../components/ui/status.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { usePageTitle } from '../hooks/page_title.js';

export default function AccountRestrictions({ subtask, error, onAbort }: {
  subtask: AccountRestrictionsSubtask;
  error: unknown;
  onAbort: (subtaskId: string, actionId: string) => void;
}) {
  const detail = subtask.account_restrictions;
  usePageTitle(detail.primary_text.text);
  const datesMod = useLazyModule(() => import('../utils/dates.js'));
  const closeAction = detail.actions.find((action) => action.link_id === 'close');

  return (
    <>
      {error ? (
        <ErrorBox error={error} />
      ) : detail.restrictions.length === 0 ? (
        <div className="mt-0 mb-0 alert alert-success" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SuccessIcon /><span>{detail.empty_text.text}</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {detail.restrictions.map((restriction) => (
            <div key={restriction.restriction_id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--alert-error)' }}>
                <WarningIcon size={22} />
                <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{restriction.primary_text.text}</h3>
              </div>
              <p style={{ margin: '0 0 20px', lineHeight: 1.65 }}>
                {restriction.secondary_text.text}
              </p>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: '0.85rem', fontWeight: 500,
                color: restriction.expires_at ? 'var(--muted)' : 'var(--alert-error)',
              }}>
                {restriction.expires_at
                  ? `${detail.labels.expires} ${datesMod ? datesMod.formatDate(restriction.expires_at) : '...'}`
                  : detail.labels.no_expiration}
              </div>
              {restriction.value != null && (
                <pre style={{
                  margin: '12px 0 0', fontSize: '0.78rem',
                  color: 'var(--muted)', background: 'var(--bg-elev)',
                  padding: '8px 12px', borderRadius: 6, overflow: 'auto',
                }}>
                  {JSON.stringify(restriction.value, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
      {closeAction && (
        <div style={{ marginTop: 18 }}>
          <button type="button" onClick={() => onAbort(subtask.subtask_id, closeAction.link_id)}>
            {closeAction.label}
          </button>
        </div>
      )}
    </>
  );
}
