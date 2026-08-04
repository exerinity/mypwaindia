import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { CardSkeleton } from '../components/shell/app_skeleton.tsx';

const LoginModal = lazy(() => import('./flow_login.tsx'));
const LogoutModal = lazy(() => import('./flow_logout.tsx'));
const WizardModal = lazy(() => import('./onboarding_setupwizard.tsx'));
const ClaimModal = lazy(() => import('./paymentlink_interim.tsx'));
const TransactionModal = lazy(() => import('./transaction_info.tsx'));

export function isFlowModalPath(pathname: string): boolean {
  return (
    pathname === '/i/flow/login' ||
    pathname === '/i/flow/logout' ||
    pathname === '/i/flow/onboarding/wizard' ||
    pathname.startsWith('/i/flow/links/interim/') ||
    pathname.startsWith('/i/flow/transaction/')
  );
}

export function FlowModals() {
  const location = useLocation();
  return (
    <Suspense fallback={<CardSkeleton />}>
      <Routes location={location}>
        <Route path="/i/flow/login" element={<LoginModal />} />
        <Route path="/i/flow/logout" element={<LogoutModal />} />
        <Route path="/i/flow/onboarding/wizard" element={<WizardModal />} />
        <Route path="/i/flow/links/interim/:token" element={<ClaimModal />} />
        <Route path="/i/flow/transaction/:id" element={<TransactionModal />} />
      </Routes>
    </Suspense>
  );
}
