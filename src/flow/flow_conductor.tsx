import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, type Location } from 'react-router-dom';
import { Modal } from '../components/ui/modal.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.ts';
import { profile_path } from '../utils/profiles.ts';
import {
  abortFlowTask,
  getFlowTask,
  submitFlowTaskAction,
  type AccountRestrictionsSubtask,
  type FlowTestSubtask,
  type FlowTaskResponse,
  type ImageSubtask,
  type LoginFormSubtask,
  type OnboardingWizardSubtask,
  type PaymentLinkInterstitialSubtask,
  type TransactionDetailSubtask,
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
const Flowback = lazy(() => import('./shell_fallback.tsx'));

function isMissingTaskError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'unknown_flow' || code === 'unknown_task';
}

function FlowSpinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
      <span className="spinner lg" />
    </div>
  );
}

function ServerFlow({ task }: { task: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { active, accounts } = useAuth();
  const [aborting, setAborting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const remaining = active ? accounts.filter((account) => account.id !== active.id) : [];
  const nextAccount = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const params = Object.fromEntries(new URLSearchParams(location.search));
  if (nextAccount) params.next_username = nextAccount.username;
  const { data, loading, error } = useApiCall<FlowTaskResponse>(
    () => getFlowTask(task, params, active ?? undefined),
    [active?.token, active?.env, task, JSON.stringify(params)]
  );

  const backgroundLocation = (
    location.state as { backgroundLocation?: unknown } | null
  )?.backgroundLocation;

  function handleClose() {
    if (backgroundLocation) {
      navigate(-1);
      return;
    }
    const destination = data?.presentation.close_behavior === 'return_or_home' ? '/' : '/dash';
    navigate(destination, { replace: true });
  }

  async function handleAbort(subtaskId: string, actionId: string) {
    if (aborting || !data?.flow_token) return;
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
      handleClose();
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

  let title: string | undefined;
  let content: ReactNode = <FlowSpinner />;

  if (!loading && (isMissingTaskError(error) || error || !data)) {
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

  const restrictions = data?.subtasks.find(
    (candidate): candidate is AccountRestrictionsSubtask => candidate.type === 'account_restrictions'
  );
  if (restrictions) {
    title = restrictions.account_restrictions.primary_text.text;
    content = <RestrictionsModal subtask={restrictions} error={error} onAbort={handleAbort} />;
  }

  if (!loading && data && !transaction && !paymentLink && !wizard && !login && !flowTest && !flowImage && !restrictions) {
    title = 'Error';
    content = <Flowback embedded onClose={handleClose} />;
  }

  if (aborting || submitting) content = <FlowSpinner />;

  const flowContent = <Suspense fallback={<FlowSpinner />}>{content}</Suspense>;

  return <Modal open onClose={handleClose} title={title}>{flowContent}</Modal>;
}

function EditItemFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { active } = useAuth();
  const [busy, set_busy] = useState(false);
  const state = location.state as {
    item_id?: number | null; account_id?: number; account_env?: string; backgroundLocation?: Location;
  } | null;
  const item_id = state?.item_id ?? null;

  if (!active) return <Navigate to="/i/flow/login" replace state={{ from: { pathname: '/account/shop' } }} />;
  if ((state?.account_id !== undefined && (state.account_id !== active.id || state.account_env !== active.env)) ||
    (item_id !== null && (!Number.isSafeInteger(item_id) || item_id < 1))) return <Navigate to="/account/shop" replace />;

  function close() {
    if (state?.backgroundLocation) navigate(-1);
    else navigate('/account/shop', { replace: true });
  }

  function save() {
    window.dispatchEvent(new Event('shop_items_updated'));
    close();
  }

  return <Modal open onClose={() => { if (!busy) close(); }} title={item_id === null ? 'New shop item' : 'Edit shop item'}>
    <Suspense fallback={<FlowSpinner />}>
      <EditItemModal key={`${item_id}:${active.env}:${active.token}`} id={item_id} auth={{ token: active.token, env: active.env }} on_save={save} on_busy={set_busy} />
    </Suspense>
  </Modal>;
}

function ReportProfileFlow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { active } = useAuth();
  const [busy, set_busy] = useState(false);
  const state = location.state as {
    username?: string; account_id?: number; account_env?: string; backgroundLocation?: Location;
  } | null;
  const username = typeof state?.username === 'string' ? state.username.trim() : '';

  if (!username) return <Navigate to="/i/profiles" replace />;
  if (!active) return <Navigate to="/i/flow/login" replace state={{ from: { pathname: profile_path(username) } }} />;
  if (username.toLowerCase() === active.username.toLowerCase() ||
    (state?.account_id !== undefined && (state.account_id !== active.id || state.account_env !== active.env))) {
    return <Navigate to={profile_path(username)} replace />;
  }

  function close() {
    if (state?.backgroundLocation) navigate(-1);
    else navigate(profile_path(username), { replace: true });
  }

  return <Modal open onClose={() => { if (!busy) close(); }} title={`Report @${username}`}>
    <Suspense fallback={<FlowSpinner />}>
      <ReportProfileModal key={`${username}:${active.env}:${active.token}`} username={username} auth={{ token: active.token, env: active.env }} on_sent={close} on_busy={set_busy} />
    </Suspense>
  </Modal>;
}

function FlowRoute() {
  const { pathname } = useLocation();
  const prefix = '/i/flow/';
  const task = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : '';
  return <ServerFlow key={task} task={task} />;
}

export function isFlowModalPath(pathname: string): boolean {
  return pathname === '/i/flow' || pathname.startsWith('/i/flow/');
}

export function FlowModals() {
  const location = useLocation();
  return (
    <Routes location={location}>
      <Route path="/i/flow/edit_item_m" element={<EditItemFlow />} />
      <Route path="/i/flow/reportprofile" element={<ReportProfileFlow />} />
      <Route path="/i/flow/*" element={<FlowRoute />} />
    </Routes>
  );
}
