import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.tsx';
import { RequireAuth } from './components/RequireAuth.tsx';

import LoginPage from './pages/Login.tsx';
import DashboardPage from './pages/Dashboard.tsx';
import AccountPage from './pages/Account.tsx';
import TransferPage from './pages/Transfer.tsx';
import HistoryPage from './pages/History.tsx';
import StatementsPage from './pages/Statements.tsx';
import CardsPage from './pages/Cards.tsx';
import TransactionPage from './pages/Transaction.tsx';
import LinksPage from './pages/Links.tsx';
import ClaimLinkPage from './pages/ClaimLink.tsx';
import LeaderboardPage from './pages/Leaderboard.tsx';
import TeamPage from './pages/Team.tsx';
import ReleaseNotesPage from './pages/ReleaseNotes.tsx';
import SettingsPage from './pages/Settings.tsx';
import LogoutPage from './pages/Logout.tsx';
import OnboardingPage from './pages/Onboarding.tsx';
import NotFoundPage from './pages/NotFound.tsx';
import CLIPage from './pages/CLI.tsx';
import AcknowledgementsPage from './pages/Acknowledgements.tsx';

export default function App() {
  return (
    <Routes>
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

        <Route path="/i/flow/mci" element={<CLIPage />} />

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
