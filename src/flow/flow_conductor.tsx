import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { CardSkeleton } from '../components/shell/app_skeleton.tsx';
import { RequireAuth } from '../components/shell/require_auth.tsx';

const LoginModal = lazy(() => import('./flow_login.tsx'));
const LogoutModal = lazy(() => import('./flow_logout.tsx'));
const WizardModal = lazy(() => import('./onboarding_setupwizard.tsx'));
const ClaimModal = lazy(() => import('./paymentlink_interstitial.tsx'));
const TransactionModal = lazy(() => import('./transaction_info.tsx'));
const DriveFileRouteModal = lazy(() => import('../pages/drive/file_route_modal.tsx'));

function DriveFileModalRoute() {
  const location = useLocation();
  const shareUuid = new URLSearchParams(location.search).get('share');
  if (shareUuid) return <DriveFileRouteModal shared shareUuid={shareUuid} />;
  return (
    <RequireAuth>
      <DriveFileRouteModal />
    </RequireAuth>
  );
}

export function isFlowModalPath(pathname: string): boolean {
  return (
    pathname === '/i/flow/login' ||
    pathname === '/i/flow/logout' ||
    pathname === '/i/flow/onboarding/wizard' ||
    pathname.startsWith('/i/flow/file/') ||
    pathname.startsWith('/i/flow/links/interstitial/') ||
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
        <Route path="/i/flow/links/interstitial/:token" element={<ClaimModal />} />
        <Route path="/i/flow/transaction/:id" element={<TransactionModal />} />
        <Route path="/i/flow/file/*" element={<DriveFileModalRoute />} />
      </Routes>
    </Suspense>
  );
}
