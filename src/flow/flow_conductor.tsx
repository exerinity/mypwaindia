import { lazy, Suspense, useState, type ReactNode } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../components/ui/modal.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.ts';
import {
  abortFlowTask,
  getFlowTask,
  submitFlowTaskAction,
  type FlowTestSubtask,
  type FlowTaskResponse,
  type LoginFormSubtask,
  type LogoutConfirmationSubtask,
  type OnboardingWizardSubtask,
  type PaymentLinkInterstitialSubtask,
  type TransactionDetailSubtask,
} from '../api/flow.ts';

const LoginModal = lazy(() => import('./flow_login.tsx'));
const LogoutModal = lazy(() => import('./flow_logout.tsx'));
const WizardModal = lazy(() => import('./onboarding_setupwizard.tsx'));
const ClaimModal = lazy(() => import('./paymentlink_interstitial.tsx'));
const TransactionModal = lazy(() => import('./transaction_info.tsx'));
const FlowTestModal = lazy(() => import('./flow_test.tsx'));
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

  const logout = data?.subtasks.find(
    (candidate): candidate is LogoutConfirmationSubtask => candidate.type === 'logout_confirmation'
  );
  if (logout) {
    content = <LogoutModal embedded onClose={handleClose} onAbort={handleAbort} subtask={logout} loading={false} error={null} />;
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

  if (!loading && data && !transaction && !paymentLink && !logout && !wizard && !login && !flowTest) {
    title = 'Error';
    content = <Flowback embedded onClose={handleClose} />;
  }

  if (aborting || submitting) content = <FlowSpinner />;

  return (
    <Modal open onClose={handleClose} title={title}>
      <Suspense fallback={<FlowSpinner />}>
        {content}
      </Suspense>
    </Modal>
  );
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
      <Route path="/i/flow/*" element={<FlowRoute />} />
    </Routes>
  );
}
