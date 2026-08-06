import { useSyncExternalStore } from 'react';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { usePageTitle } from '../../hooks/page_title.js';
import { resetAgentThread } from '../../api/agent.ts';
import { subscribe, getRate, clearItems } from '../../utils/agent_store.ts';
import { ClankerChat, resetLabel } from '../../components/clanker/clanker_chat.tsx';

export default function AgentPage() {
  usePageTitle('Clanker');
  const { active } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const rate = useSyncExternalStore(subscribe, getRate);

  async function wipe() {
    clearItems();
    if (!active) return;
    try {
      await resetAgentThread(active.token);
      toast.success('OK, your thread has been reset');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not clear the thread');
    }
  }

  if (settings.scambait) {
    return <h1 className="mt-0">Page unavailable</h1>;
  }

  return (
    <>
      <div className="row spread" style={{ alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <h1 className="mt-0 mb-0">Clanker</h1>
        {rate && (
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '0.8rem' }}>
              {rate.remaining} of {rate.limit} left (resets in {resetLabel(rate.reset)})
            </span>
            <button className="btn ghost compact" onClick={wipe}>Clear</button>
          </div>
        )}
      </div>

      <ClankerChat variant="page" />
    </>
  );
}
