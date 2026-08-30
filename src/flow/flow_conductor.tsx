import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { CardSkeleton } from '../components/shell/app_skeleton.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useApiCall } from '../hooks/api_call.ts';
import {
  getFlowTask,
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
const Flowback = lazy(() => import('./shell_fallback.tsx'));

function isMissingTaskError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === 'unknown_flow' || code === 'unknown_task';
}

function ServerFlow({ task }: { task: string }) {
  const location = useLocation();
  const { active, accounts } = useAuth();
  const remaining = active ? accounts.filter((account) => account.id !== active.id) : [];
  const nextAccount = remaining.length > 0 ? remaining[remaining.length - 1] : null;
  const params = Object.fromEntries(new URLSearchParams(location.search));
  if (nextAccount) params.next_username = nextAccount.username;
  const { data, loading, error } = useApiCall<FlowTaskResponse>(
    () => getFlowTask(task, params, active ?? undefined),
    [active?.token, active?.env, task, JSON.stringify(params)]
  );

  if (isMissingTaskError(error)) return <Flowback />;
  if (loading) return <CardSkeleton />;
  if (error || !data) return <Flowback />;

  const transaction = data.subtasks.find(
    (candidate): candidate is TransactionDetailSubtask => candidate.type === 'transaction_detail'
  );
  if (transaction) {
    return <TransactionModal subtask={transaction} loading={false} error={null} />;
  }

  const paymentLink = data.subtasks.find(
    (candidate): candidate is PaymentLinkInterstitialSubtask => candidate.type === 'payment_link_interstitial'
  );
  if (paymentLink) {
    return <ClaimModal subtask={paymentLink} loading={false} error={null} />;
  }

  const logout = data.subtasks.find(
    (candidate): candidate is LogoutConfirmationSubtask => candidate.type === 'logout_confirmation'
  );
  if (logout) {
    return <LogoutModal subtask={logout} loading={false} error={null} />;
  }

  const wizard = data.subtasks.find(
    (candidate): candidate is OnboardingWizardSubtask => candidate.type === 'onboarding_wizard'
  );
  if (wizard) {
    return <WizardModal subtask={wizard} loading={false} error={null} />;
  }

  const login = data.subtasks.find(
    (candidate): candidate is LoginFormSubtask => candidate.type === 'login_form'
  );
  if (login) {
    return <LoginModal subtask={login} flowToken={data.flow_token} loading={false} error={null} />;
  }

  return <Flowback />;
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
    <Suspense fallback={<CardSkeleton />}>
      <Routes location={location}>
        <Route path="/i/flow/*" element={<FlowRoute />} />
      </Routes>
    </Suspense>
  );
}
