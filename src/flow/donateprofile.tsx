import { utility_classes } from '../styles/utils.stylex.ts';
import { profile_classes } from '../styles/profiles.stylex.ts';
import { button_classes } from '../styles/buttons.stylex.ts';
import { alert_classes } from '../styles/alerts.stylex.ts';
import { form_classes } from '../styles/forms.stylex.ts';
import { stat_classes } from '../styles/stats.stylex.ts';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { FlowTaskInput, FlowTaskResponse, ProfileDonationSubtask } from '../api/flow.ts';
import { FloatingInput, FloatingTextarea } from '../components/ui/floating_input.tsx';
import { ErrorBox } from '../components/ui/status.tsx';
import { useGlobalData } from '../context/global_data_ctx.tsx';
import { formatINR, rupeesToPaisa } from '../utils/money.js';

export default function DonateProfileModal({ subtask, on_submit, on_complete, on_busy }: {
  subtask: ProfileDonationSubtask; on_submit: (input: FlowTaskInput) => Promise<FlowTaskResponse>; on_complete: () => void; on_busy: (value: boolean) => void;
}) {
  const [data, set_data] = useState(subtask.profile_donation);
  const [amount, set_amount] = useState('');
  const [message, set_message] = useState('');
  const [public_name, set_public_name] = useState(true);
  const [reviewing, set_reviewing] = useState(false);
  const [busy, set_busy] = useState(false);
  const [error, set_error] = useState<unknown>(null);
  const { refetchUserInfo } = useGlobalData();
  const location = useLocation();
  const action = data.actions.find((candidate) => candidate.link_id === 'donate' && candidate.link_type === 'task');
  const paisa = rupeesToPaisa(amount);
  const valid = Number.isSafeInteger(paisa) && paisa >= data.minimum && message.length <= data.message_limit;

  async function donate() {
    if (busy || !reviewing || !valid || !action || data.result) return;
    set_busy(true);
    on_busy(true);
    set_error(null);
    try {
      const response = await on_submit({ subtask_id: subtask.subtask_id, action_id: action.link_id, values: { username: data.username, amount: paisa, message, public: public_name } });
      const receipt = response.subtasks.find((candidate): candidate is ProfileDonationSubtask => candidate.type === 'profile_donation');
      if (!receipt?.profile_donation.result) throw new Error('Check your transaction history before retrying. The donation receipt could not be loaded.');
      set_data(receipt.profile_donation);
      void refetchUserInfo().catch(() => {});
      window.dispatchEvent(new Event('profile_donated'));
    } catch (next_error) { set_error(next_error); }
    finally { set_busy(false); on_busy(false); }
  }

  return <div>
    <ErrorBox error={error} />
    {data.result ? <>
      <div className={`alert ${data.result.status === 'pending' ? 'alert-warning' : 'alert-success'} ${data.result.status === 'pending' ? alert_classes.warning : alert_classes.success}`}>{data.result.status === 'pending' ? data.pending_text.text : data.confirmed_text.text}</div>
      <div className={`${stat_classes.card} mt-2 ${utility_classes.mt_2}`}><span className={stat_classes.label}>Donation to @{data.username}</span><span className={stat_classes.value}>{formatINR(data.result.amount)}</span></div>
      <p className={stat_classes.sub}>{data.result.public ? 'Your name is shown in supporters once confirmed.' : 'Your name is hidden in supporters.'}</p>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
        <Link className="btn secondary" replace to={`/i/flow/transaction/${encodeURIComponent(data.result.transaction_id)}`} state={location.state}>{data.labels.transaction}</Link>
        <button onClick={on_complete}>{data.labels.done}</button>
      </div>
    </> : reviewing ? <>
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>{data.labels.confirm}</h3>
      <div className={stat_classes.card}><span className={stat_classes.label}>To @{data.username}</span><span className={stat_classes.value}>{formatINR(paisa)}</span></div>
      {message && <p className={`profile_prose ${profile_classes.prose}`}>{message}</p>}
      <p className={`muted ${utility_classes.muted}`}>{public_name ? 'Your name will be shown in supporters.' : 'Your name will be hidden in supporters.'}</p>
      <p className={stat_classes.sub}>{data.recipient_notice.text}</p>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
        <button disabled={busy || !valid} onClick={donate}>{busy ? action?.pending_label : `${action?.label} ${formatINR(paisa)}`}</button>
        <button className="secondary" disabled={busy} onClick={() => set_reviewing(false)}>{data.labels.back}</button>
      </div>
    </> : <form onSubmit={(event) => { event.preventDefault(); if (valid) { set_error(null); set_reviewing(true); } }}>
      <FloatingInput id="donation_amount" label={data.labels.amount} inputMode="decimal" required value={amount} onChange={(event) => set_amount(event.target.value)} />
      <p className={stat_classes.sub}>Minimum {formatINR(data.minimum)}</p>
      <FloatingTextarea id="donation_message" label={data.labels.message} maxLength={data.message_limit} value={message} onChange={(event) => set_message(event.target.value)} />
      <label className={`checkbox-row ${form_classes.checkbox_row}`}><input type="checkbox" checked={public_name} onChange={(event) => set_public_name(event.target.checked)} />{data.labels.public}</label>
      <p className={stat_classes.sub}>{data.recipient_notice.text}</p>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}><button disabled={!valid || !action}>{data.labels.review}</button></div>
    </form>}
  </div>;
}
