import { utility_classes } from '../styles/utils.stylex.ts';
import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/modal.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.ts';
import {
  abortFlowTask,
  getFlowTask,
  submitFlowTaskAction,
  type AccountRestrictionsSubtask,
  type FlowTestSubtask,
  type FlowTaskResponse,
  type FlowTaskInput,
  type ImageSubtask,
  type LoginFormSubtask,
  type OnboardingWizardSubtask,
  type PaymentLinkInterstitialSubtask,
  type TransactionDetailSubtask,
  type ShopItemEditorSubtask,
  type ProfileReportSubtask,
  type ProfileDonationSubtask,
  type TextContentSubtask,
} from '../api/flow.ts';

const LoginModal = lazy(() => import('./flow_login.tsx'));
const WizardModal = lazy(() => import('./onboarding_setupwizard.tsx'));
const ClaimModal = lazy(() => import('./paymentlink_interstitial.tsx'));
const TransactionModal = lazy(() => import('./transaction_info.tsx'));
const FlowTestModal = lazy(() => import('./flow_test.tsx'));
const FlowImageModal = lazy(() => import('./flow_image.tsx'));
const RestrictionsModal = lazy(() => import('./account_restrictions.tsx'));
const EditItemModal = lazy(() => import('./edit_item_m.tsx'));
const ReportProfileModal = lazy(() => import('./reportprofile.tsx'));
const DonateProfileModal = lazy(() => import('./donateprofile.tsx'));
const TextContentModal = lazy(() => import('./text_content.tsx'));
const Flowback = lazy(() => import('./shell_fallback.tsx'));

function FlowSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <span className={`spinner lg ${utility_classes.spinner_large}`} />
    </div>
  );
}

function ServerFlow({ task }: { task: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { active, accounts } = useAuth();
  const [aborting, setAborting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form_busy, set_form_busy] = useState(false);
  const remaining = active ? accounts.filter((account) => account.id !== active.id) : [];
  const nextAccount = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const flow_state = location.state as { item_id?: number | null; username?: string; account_id?: number; account_env?: string } | null;
  const form_flow = task === 'edit_item_m' || task === 'reportprofile' || task === 'donateprofile';
  const params: Record<string, string> = form_flow ? {} : Object.fromEntries(new URLSearchParams(location.search));
  if (task === 'edit_item_m' && flow_state?.item_id != null) params.item_id = String(flow_state.item_id);
  if ((task === 'reportprofile' || task === 'donateprofile') && flow_state?.username) params.username = flow_state.username;
  if (nextAccount) params.next_username = nextAccount.username;
  const { data, loading, error } = useApiCall<FlowTaskResponse>(
    () => {
      if (form_flow && flow_state?.account_id !== undefined && (flow_state.account_id !== active?.id || flow_state.account_env !== active?.env)) {
        return Promise.reject(new Error('This flow belongs to a different account'));
      }
      return getFlowTask(task, params, active ?? undefined);
    },
    [active?.token, active?.env, task, JSON.stringify(params)]
  );

  const backgroundLocation = (
    location.state as { backgroundLocation?: unknown } | null
  )?.backgroundLocation;

  function close_flow() {
    if (backgroundLocation) {
      navigate(-1);
      return;
    }
    const destination = data?.presentation.close_behavior === 'return_or_home' ? '/' : '/dash';
    navigate(destination, { replace: true });
  }

  function handleClose() {
    if (form_busy || aborting || submitting) return;
    const form_subtask = data?.subtasks.find((candidate) => candidate.type === 'shop_item_editor' || candidate.type === 'profile_report' || candidate.type === 'profile_donation');
    const form_actions = form_subtask?.type === 'shop_item_editor' ? form_subtask.shop_item_editor.actions : form_subtask?.type === 'profile_report' ? form_subtask.profile_report.actions : form_subtask?.profile_donation.actions;
    const cancel_action = form_actions?.find((action) => action.link_type === 'abort');
    if (form_subtask && cancel_action) {
      void handleAbort(form_subtask.subtask_id, cancel_action.link_id);
      return;
    }
    close_flow();
  }

  async function handleAbort(subtaskId: string, actionId: string) {
    if (aborting || submitting || form_busy || !data?.flow_token) return;
    setAborting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await abortFlowTask(data.flow_token, {
        subtask_id: subtaskId,
        action_id: actionId,
      }, active ?? undefined);
    } catch {
      // Fuck
    } finally {
      close_flow();
    }
  }

  async function handleTask(subtaskId: string, actionId: string) {
    if (submitting || !data?.flow_token) return;
    setSubmitting(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await submitFlowTaskAction(data.flow_token, {
        subtask_id: subtaskId,
        action_id: actionId,
      }, active ?? undefined);
    } finally {
      setSubmitting(false);
    }
  }

  async function handle_form_task(input: FlowTaskInput) {
    if (!data?.flow_token) throw new Error('The flow is not ready');
    return submitFlowTaskAction(data.flow_token, input, active ?? undefined);
  }

  function item_saved() {
    window.dispatchEvent(new Event('shop_items_updated'));
    close_flow();
  }

  let title: string | undefined;
  let content: ReactNode = <FlowSpinner />;

  if (!loading && (error || !data)) {
    title = 'Error';
    content = <Flowback embedded onClose={handleClose} />;
  }

  const transaction = data?.subtasks.find(
    (candidate): candidate is TransactionDetailSubtask => candidate.type === 'transaction_detail'
  );
  if (transaction) {
    const detail = transaction.transaction_detail;
    const outgoing = active ? detail.transaction.sender?.id === active.id : false;
    title = outgoing ? detail.outgoing_title.text : detail.incoming_title.text;
    content = (
      <TransactionModal embedded onClose={handleClose} onAbort={handleAbort} subtask={transaction} loading={false} error={null} />
    );
  }

  const paymentLink = data?.subtasks.find(
    (candidate): candidate is PaymentLinkInterstitialSubtask => candidate.type === 'payment_link_interstitial'
  );
  if (paymentLink) {
    title = paymentLink.payment_link_interstitial.primary_text.text;
    content = <ClaimModal embedded onClose={handleClose} subtask={paymentLink} loading={false} error={null} />;
  }

  const wizard = data?.subtasks.find(
    (candidate): candidate is OnboardingWizardSubtask => candidate.type === 'onboarding_wizard'
  );
  if (wizard) {
    content = <WizardModal embedded onClose={handleClose} onAbort={handleAbort} subtask={wizard} loading={false} error={null} />;
  }

  const login = data?.subtasks.find(
    (candidate): candidate is LoginFormSubtask => candidate.type === 'login_form'
  );
  if (login) {
    content = (
      <LoginModal
        embedded
        onClose={handleClose}
        onAbort={handleAbort}
        subtask={login}
        flowToken={data?.flow_token ?? null}
        loading={false}
        error={null}
      />
    );
  }

  const flowTest = data?.subtasks.find(
    (candidate): candidate is FlowTestSubtask => candidate.type === 'flow_test'
  );
  if (flowTest) {
    title = flowTest.flow_test.primary_text.text;
    content = <FlowTestModal subtask={flowTest} onAbort={handleAbort} onTask={handleTask} />;
  }

  const flowImage = data?.subtasks.find(
    (candidate): candidate is ImageSubtask => candidate.type === 'image'
  );
  if (flowImage) {
    content = <FlowImageModal subtask={flowImage} />;
  }

  const text_content = data?.subtasks.find(
    (candidate): candidate is TextContentSubtask => candidate.type === 'text_content'
  );
  if (text_content) {
    title = text_content.text_content.primary_text.text;
    content = <TextContentModal subtask={text_content} />;
  }

  const restrictions = data?.subtasks.find(
    (candidate): candidate is AccountRestrictionsSubtask => candidate.type === 'account_restrictions'
  );
  if (restrictions) {
    title = restrictions.account_restrictions.primary_text.text;
    content = <RestrictionsModal subtask={restrictions} error={error} onAbort={handleAbort} />;
  }

  const shop_item = data?.subtasks.find((candidate): candidate is ShopItemEditorSubtask => candidate.type === 'shop_item_editor');
  if (shop_item) {
    title = shop_item.shop_item_editor.primary_text.text;
    content = <EditItemModal key={data?.flow_token} subtask={shop_item} on_submit={handle_form_task} on_complete={item_saved} on_busy={set_form_busy} />;
  }

  const profile_report = data?.subtasks.find((candidate): candidate is ProfileReportSubtask => candidate.type === 'profile_report');
  if (profile_report) {
    title = profile_report.profile_report.primary_text.text;
    content = <ReportProfileModal key={data?.flow_token} subtask={profile_report} on_submit={handle_form_task} on_complete={close_flow} on_busy={set_form_busy} />;
  }

  const profile_donation = data?.subtasks.find((candidate): candidate is ProfileDonationSubtask => candidate.type === 'profile_donation');
  if (profile_donation) {
    title = profile_donation.profile_donation.primary_text.text;
    content = <DonateProfileModal key={data?.flow_token} subtask={profile_donation} on_submit={handle_form_task} on_complete={close_flow} on_busy={set_form_busy} />;
  }

  if (!loading && data && !transaction && !paymentLink && !wizard && !login && !flowTest && !flowImage && !text_content && !restrictions && !shop_item && !profile_report && !profile_donation) {
    title = 'Error';
    content = <Flowback embedded onClose={handleClose} />;
  }

  if (aborting || submitting) content = <FlowSpinner />;

  const flowContent = <Suspense fallback={<FlowSpinner />}>{content}</Suspense>;

  return <Modal open onClose={handleClose} title={title}>{flowContent}</Modal>;
}

function FlowRoute() {
  const location = useLocation();
  const { active } = useAuth();
  const prefix = '/i/flow/';
  const task = location.pathname.startsWith(prefix) ? location.pathname.slice(prefix.length) : '';
  const form_flow = task === 'edit_item_m' || task === 'reportprofile' || task === 'donateprofile';
  return <ServerFlow key={form_flow ? `${task}:${active?.env}:${active?.token}:${location.key}` : task} task={task} />;
}

export function isFlowModalPath(pathname: string): boolean {
  return pathname === '/i/flow' || pathname.startsWith('/i/flow/');
}

export function FlowModals() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/i/flow/*" element={<FlowRoute />} />
    </Routes>
  );
}
