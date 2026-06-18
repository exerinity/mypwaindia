import { Routes, Route, Navigate, Outlet, useLocation, useParams, type Location } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { AppLayout } from './components/app_layout.tsx';
import { RequireAuth } from './components/require_auth.tsx';
import { useSettings } from './context/settings_ctx.tsx';
import { setCanonical } from './utils/canonical.ts';

const LoginPage = lazy(() => import('./pages/login.tsx'));
const LogoutPage = lazy(() => import('./pages/logout.tsx'));
const OnboardingPage = lazy(() => import('./pages/onboarding.tsx'));
const DashboardPage = lazy(() => import('./pages/dashboard.tsx'));
const AccountPage = lazy(() => import('./pages/account.tsx'));
const CardsPage = lazy(() => import('./pages/cards.tsx'));
const TransferPage = lazy(() => import('./pages/transfer.tsx'));
const BulkTransferPage = lazy(() => import('./pages/bulk_transfer.tsx'));
const HistoryPage = lazy(() => import('./pages/history.tsx'));
const StatementsPage = lazy(() => import('./pages/statements.tsx'));
const TransactionPage = lazy(() => import('./pages/transaction.tsx'));
const OldTransactionPage = lazy(() => import('./pages/old_transaction.tsx'));
const LinksPage = lazy(() => import('./pages/links.tsx'));
const ClaimLinkPage = lazy(() => import('./pages/claim_link.tsx'));
const LeaderboardPage = lazy(() => import('./pages/leaderboard.tsx'));
const TeamPage = lazy(() => import('./pages/team.tsx'));
const SubscriptionsPage = lazy(() => import('./pages/subscriptions.tsx'));
const SettingsPage = lazy(() => import('./pages/settings.tsx'));
const IotmButtonPage = lazy(() => import('./pages/iotm_button.tsx'));
const IOTMPage = lazy(() => import('./pages/iotm.tsx'));
const CLIPage = lazy(() => import('./pages/cli.tsx'));
const MPTIPage = lazy(() => import('./pages/toys.tsx'));
const ReleaseNotesPage = lazy(() => import('./pages/release_notes.tsx'));
const AcknowledgementsPage = lazy(() => import('./pages/acknowledgements.tsx'));
const RestrictionsPage = lazy(() => import('./pages/restrictions.tsx'));
const ConnectionPage = lazy(() => import('./pages/connection.tsx'));
const ThemeApplyPage = lazy(() => import('./pages/theme_apply.tsx'));
const SettingsApplyPage = lazy(() => import('./pages/settings_apply.tsx'));
const NotFoundPage = lazy(() => import('./pages/not_found.tsx'));
const FlowNotFoundPage = lazy(() => import('./pages/flow_not_found.tsx'));

function LoginRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/i/flow/login${search}`} replace />;
}

function HomeRedirect() {
  const { settings } = useSettings();
  return <Navigate to={settings.homePage} replace />;
}

function TransactionRedirect() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get('id');
  return <Navigate to={id ? `/i/flow/transaction/${id}` : '/dash'} replace />;
}

function PayLinkRedirect() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');
  return <Navigate to={token ? `/links/claim/${token}` : '/links/claim'} replace />;
}

function ExternalRedirect({ to }: { to: string }) {
  window.location.replace(to);
  return null;
}

function ThemeRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/i/flow/theme${search}`} replace />;
}

function MerchantRedirect() {
  const { '*': splat } = useParams();
  window.location.replace(`https://mypayindia.com/merchant/${splat ?? ''}`);
  return null;
}

export default function App() {
  const location = useLocation();
  const bgLoc = (location.state as { backgroundLocation?: Location })?.backgroundLocation;
  const istr = location.pathname.startsWith('/i/flow/transaction/');

  useEffect(() => { setCanonical(location.pathname); }, [location.pathname]);

  return (
    <>
    {(!istr || bgLoc) && <Routes location={bgLoc || location}>
      <Route path="/pay/link" element={<PayLinkRedirect />} />

      <Route path="/login" element={<LoginRedirect />} />

      <Route path="/leaderboard" element={<Navigate to="/i/leaderboard" replace />} />
      <Route path="/team" element={<Navigate to="/i/team" replace />} />
      <Route path="/docs" element={<ExternalRedirect to="https://mypayindia.com/docs" />} />
      <Route path="/app" element={<ExternalRedirect to="https://mypayindia.com/app" />} />
      <Route path="/signup" element={<ExternalRedirect to="https://mypayindia.com/accountservices/register" />} />
      <Route path="/accountservices/dashboard" element={<Navigate to="/dash" replace />} />
      <Route path="/accountservices/transhist" element={<Navigate to="/account/history" replace />} />
      <Route path="/accountservices/trans" element={<TransactionRedirect />} />
      <Route path="/accountservices/transfer" element={<Navigate to="/account/transfer" replace />} />
      <Route path="/accountservices/iotm/button/" element={<Navigate to="/iotm/button" replace />} />
      <Route path="/accountservices/iotm/button/" element={<Navigate to="/iotm/button" replace />} />
      <Route path="/accountservices/paymentlinks" element={<Navigate to="/links" replace />} />
      <Route path="/accountservices/logout" element={<Navigate to="/i/flow/logout" replace />} />
      <Route path="/merchant/*" element={<MerchantRedirect />} />
      <Route path="/button" element={<Navigate to="/iotm/button" replace />} />

      <Route element={<Suspense fallback={null}><Outlet /></Suspense>}>
        <Route path="/i/flow/login" element={<LoginPage />} />
        <Route path="/i/flow/logout" element={<LogoutPage />} />
        <Route path="/i/flow/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/dash" element={<DashboardPage />} />
        <Route path="/i/leaderboard" element={<LeaderboardPage />} />
        <Route path="/i/team" element={<TeamPage />} />
        <Route path="/i/release_notes" element={<ReleaseNotesPage />} />
        <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
        <Route path="/settings/:category" element={<SettingsPage />} />
        <Route path="/settings:old" element={<FlowNotFoundPage />} />
        <Route path="/i/acknowledgements" element={<AcknowledgementsPage />} />
        <Route path="/i/flow/scambaitmode" element={<Navigate to="/settings/scambait" replace />} />
        <Route path="/i/flow/connection" element={<ConnectionPage />} />
        <Route path="/i/flow/theme" element={<ThemeApplyPage />} />
        <Route path="/i/flow/settings" element={<SettingsApplyPage />} />
        <Route path="/theme" element={<ThemeRedirect />} />

        <Route path="/i/flow/mci" element={<CLIPage />} />
        <Route path="/i/flow/mci/focus" element={<CLIPage />} />
        <Route path="/i/flow/mpti" element={<MPTIPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/restrictions" element={<RestrictionsPage />} />
          <Route path="/account/transfer" element={<TransferPage />} />
          <Route path="/account/transfer/bulk" element={<BulkTransferPage />} />
          <Route path="/account/history" element={<HistoryPage />} />
          <Route path="/i/flow/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/links/claim" element={<ClaimLinkPage />} />
          <Route path="/links/claim/:token" element={<ClaimLinkPage />} />
          <Route path="/dash/statements" element={<StatementsPage />} />
          <Route path="/dash/cards" element={<CardsPage />} />
          <Route path="/i/flow/button" element={<Navigate to="/iotm/button" replace />} />
          <Route path="/iotm/button" element={<IotmButtonPage />} />
          <Route path="/iotm" element={<IOTMPage />} />
          <Route path="/i/flow/transaction:old/:id" element={<OldTransactionPage />} />
        </Route>

        <Route path="/i/flow/*" element={<FlowNotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>}
    {istr && (
      <Suspense fallback={null}>
        <TransactionPage />
      </Suspense>
    )}
    {bgLoc && location.pathname === '/i/flow/logout' && (
      <Suspense fallback={null}>
        <LogoutPage />
      </Suspense>
    )}
    {bgLoc && location.pathname === '/i/flow/login' && (
      <Suspense fallback={null}>
        <LoginPage />
      </Suspense>
    )}
    </>
  );
}
