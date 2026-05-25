import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AppLayout } from './components/app_layout.tsx';
import { RequireAuth } from './components/require_auth.tsx';
import { useSettings } from './context/settings_ctx.tsx';

import LoginPage from './pages/login.tsx';
import DashboardPage from './pages/dashboard.tsx';
import AccountPage from './pages/account.tsx';
import TransferPage from './pages/transfer.tsx';
import HistoryPage from './pages/history.tsx';
import StatementsPage from './pages/statements.tsx';
import CardsPage from './pages/cards.tsx';
import TransactionPage from './pages/transaction.tsx';
import LinksPage from './pages/links.tsx';
import ClaimLinkPage from './pages/claim_link.tsx';
import LeaderboardPage from './pages/leaderboard.tsx';
import TeamPage from './pages/team.tsx';
import ReleaseNotesPage from './pages/release_notes.tsx';
import SettingsPage from './pages/settings.tsx';
import OldSettingsPage from './pages/old_settings.tsx';
import LogoutPage from './pages/logout.tsx';
import OnboardingPage from './pages/onboarding.tsx';
import NotFoundPage from './pages/not_found.tsx';
import CLIPage from './pages/cli.tsx';
import AcknowledgementsPage from './pages/acknowledgements.tsx';
import RestrictionsPage from './pages/restrictions.tsx';
import ConnectionPage from './pages/connection.tsx';
import IotmButtonPage from './pages/iotm_button.tsx';

function HomeRedirect() {
  const { settings } = useSettings();
  return <Navigate to={settings.homePage} replace />;
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

function MerchantRedirect() {
  const { '*': splat } = useParams();
  window.location.replace(`https://mypayindia.com/merchant/${splat ?? ''}`);
  return null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/pay/link" element={<PayLinkRedirect />} />

      <Route path="/leaderboard" element={<Navigate to="/i/leaderboard" replace />} />
      <Route path="/team" element={<Navigate to="/i/team" replace />} />
      <Route path="/docs" element={<ExternalRedirect to="https://mypayindia.com/docs" />} />
      <Route path="/app" element={<ExternalRedirect to="https://mypayindia.com/app" />} />
      <Route path="/accountservices/dashboard" element={<Navigate to="/dash" replace />} />
      <Route path="/accountservices/transhist" element={<Navigate to="/account/history" replace />} />
      <Route path="/accountservices/transfer" element={<Navigate to="/account/transfer" replace />} />
      <Route path="/accountservices/iotm" element={<Navigate to="/i/invest" replace />} />
      <Route path="/merchant/*" element={<MerchantRedirect />} />
      <Route path="/button" element={<Navigate to="/i/flow/button" replace />} />

      <Route path="/i/flow/login" element={<LoginPage />} />
      <Route path="/i/flow/logout" element={<LogoutPage />} />
      <Route path="/i/flow/onboarding" element={<OnboardingPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRedirect />} />

        {/* public */}
        <Route path="/dash" element={<DashboardPage />} />
        <Route path="/i/leaderboard" element={<LeaderboardPage />} />
        <Route path="/i/team" element={<TeamPage />} />
        <Route path="/i/release_notes" element={<ReleaseNotesPage />} />
        <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
        <Route path="/settings/:category" element={<SettingsPage />} />
        <Route path="/settings/old" element={<OldSettingsPage />} />
        <Route path="/i/acknowledgements" element={<AcknowledgementsPage />} />
        <Route path="/i/flow/scambaitmode" element={<Navigate to="/settings/scambait" replace />} />
        <Route path="/i/flow/connection" element={<ConnectionPage />} />

        <Route path="/i/flow/mci" element={<CLIPage />} />
        <Route path="/i/flow/mci/focus" element={<CLIPage />} />

        {/* login */}
        <Route element={<RequireAuth />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/restrictions" element={<RestrictionsPage />} />
          <Route path="/account/transfer" element={<TransferPage />} />
          <Route path="/account/history" element={<HistoryPage />} />
          <Route path="/links" element={<LinksPage />} />
          <Route path="/links/claim" element={<ClaimLinkPage />} />
          <Route path="/links/claim/:token" element={<ClaimLinkPage />} />
          <Route path="/dash/statements" element={<StatementsPage />} />
          <Route path="/dash/cards" element={<CardsPage />} />
          <Route path="/i/transaction/:id" element={<TransactionPage />} />
          <Route path="/i/flow/button" element={<IotmButtonPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
