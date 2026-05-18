import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AppLayout } from './components/app_layout.tsx';
import { RequireAuth } from './components/require_auth.tsx';

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
import LogoutPage from './pages/logout.tsx';
import OnboardingPage from './pages/onboarding.tsx';
import NotFoundPage from './pages/not_found.tsx';
import CLIPage from './pages/cli.tsx';
import AcknowledgementsPage from './pages/acknowledgements.tsx';
import ScambaitPage from './pages/scambait.tsx';

function PayLinkRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/dash/links/claim${search}`} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/pay/link" element={<PayLinkRedirect />} />
      <Route path="/i/flow/login" element={<LoginPage />} />
      <Route path="/i/flow/logout" element={<LogoutPage />} />
      <Route path="/i/flow/onboarding" element={<OnboardingPage />} />

      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/dash" replace />} />

        {/* public */}
        <Route path="/dash" element={<DashboardPage />} />
        <Route path="/i/leaderboard" element={<LeaderboardPage />} />
        <Route path="/i/team" element={<TeamPage />} />
        <Route path="/i/release_notes" element={<ReleaseNotesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/i/acknowledgements" element={<AcknowledgementsPage />} />
        <Route path="/i/flow/scambaitmode" element={<ScambaitPage />} />

        <Route path="/i/flow/mci" element={<CLIPage />} />
        <Route path="/i/flow/mci/focus" element={<CLIPage />} />

        {/* login */}
        <Route element={<RequireAuth />}>
          <Route path="/dash/account" element={<AccountPage />} />
          <Route path="/dash/account/transfer" element={<TransferPage />} />
          <Route path="/dash/account/history" element={<HistoryPage />} />
          <Route path="/dash/links" element={<LinksPage />} />
          <Route path="/dash/links/claim" element={<ClaimLinkPage />} />
          <Route path="/dash/statements" element={<StatementsPage />} />
          <Route path="/dash/cards" element={<CardsPage />} />
          <Route path="/i/transaction/:id" element={<TransactionPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
