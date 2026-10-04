import { utility_classes } from '../styles/utils.stylex.ts';
import { button_classes } from '../styles/buttons.stylex.ts';
import { useState } from 'react';
import type { FlowTaskInput, FlowTaskResponse, ProfileReportSubtask } from '../api/flow.ts';
import type { ReportReason } from '../api/profile.js';
import { ErrorBox } from '../components/ui/status.tsx';
import { FloatingTextarea } from '../components/ui/floating_input.tsx';
import { useToast } from '../context/toast_ctx.tsx';

export default function ReportProfileModal({ subtask, on_submit, on_complete, on_busy }: {
  subtask: ProfileReportSubtask; on_submit: (input: FlowTaskInput) => Promise<FlowTaskResponse>; on_complete: () => void; on_busy: (value: boolean) => void;
}) {
  const data = subtask.profile_report;
  const submit_action = data.actions.find((action) => action.link_id === 'submit' && action.link_type === 'task');
  const [reason, set_reason] = useState<ReportReason>(data.reasons[0]?.value ?? 'scam');
  const [details, set_details] = useState('');
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const toast = useToast();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !submit_action || (reason === 'other' && !details.trim())) return;
    set_busy(true);
    on_busy(true);
    set_error(null);
    try {
      await on_submit({ subtask_id: subtask.subtask_id, action_id: submit_action.link_id, values: { username: data.username, reason, details } });
      toast.success(data.success_text.text);
      on_complete();
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); on_busy(false); }
  }

  return <form onSubmit={submit}>
    <ErrorBox error={error} />
    <label htmlFor="report_reason">{data.labels.reason}</label>
    <select id="report_reason" disabled={busy} value={reason} onChange={(event) => set_reason(event.target.value as ReportReason)}>
      {data.reasons.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
    <FloatingTextarea id="report_details" label={reason === 'other' ? data.labels.required_details : data.labels.details} disabled={busy} required={reason === 'other'} value={details} onChange={(event) => set_details(event.target.value)} />
    <div className={`btn-row mt-2 ${button_classes.row} ${utility_classes.row} ${utility_classes.mt_2}`}><button disabled={busy || !submit_action || (reason === 'other' && !details.trim())}>{busy ? submit_action?.pending_label : submit_action?.label}</button></div>
  </form>;
}
