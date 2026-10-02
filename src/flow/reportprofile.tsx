import { useState } from 'react';
import type { AuthOpts } from '../api/client.js';
import { report_profile } from '../api/profile.js';
import type { ReportReason } from '../api/profile.js';
import { ErrorBox } from '../components/ui/status.tsx';
import { FloatingTextarea } from '../components/ui/floating_input.tsx';
import { useToast } from '../context/toast_ctx.tsx';

export default function ReportProfileModal({ username, auth, on_sent, on_busy }: {
  username: string; auth: AuthOpts; on_sent: () => void; on_busy: (value: boolean) => void;
}) {
  const [reason, set_reason] = useState<ReportReason>('scam');
  const [details, set_details] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || (reason === 'other' && !details.trim())) return;
    set_busy(true);
    on_busy(true);
    set_error(null);
    try {
      await report_profile(auth, username, reason, details);
      toast.success('Report sent. Thank you!');
      on_sent();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); on_busy(false); }
  }

  return <form onSubmit={submit}>
    <ErrorBox error={error} />
    <label htmlFor="report_reason">Reason</label>
    <select id="report_reason" disabled={busy} value={reason} onChange={(event) => set_reason(event.target.value as ReportReason)}>
      {['scam', 'impersonation', 'inappropriate', 'spam', 'other'].map((value) => <option key={value} value={value}>{value}</option>)}
    </select>
    <FloatingTextarea id="report_details" label={`Details${reason === 'other' ? ' (required)' : ' (optional)'}`} disabled={busy} required={reason === 'other'} value={details} onChange={(event) => set_details(event.target.value)} />
    <div className="btn-row mt-2"><button disabled={busy || (reason === 'other' && !details.trim())}>{busy ? 'Sending...' : 'Send report'}</button></div>
  </form>;
}
