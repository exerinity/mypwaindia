import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { RequireAuth } from './components/RequireAuth.jsx';

import LoginPage from './pages/Login.jsx';
import DashboardPage from './pages/Dashboard.jsx';
import AccountPage from './pages/Account.jsx';
import TransferPage from './pages/Transfer.jsx';
import HistoryPage from './pages/History.jsx';
import StatementsPage from './pages/Statements.jsx';
import CardsPage from './pages/Cards.jsx';
import TransactionPage from './pages/Transaction.jsx';
import LinksPage from './pages/Links.jsx';
import ClaimLinkPage from './pages/ClaimLink.jsx';
import LeaderboardPage from './pages/Leaderboard.jsx';
import TeamPage from './pages/Team.jsx';
import ReleaseNotesPage from './pages/ReleaseNotes.jsx';
import SettingsPage from './pages/Settings.jsx';
import LogoutPage from './pages/Logout.jsx';
import NotFoundPage from './pages/NotFound.jsx';
import CLIPage from './pages/CLI.jsx';

export default function App() {
  return (
    <Routes>
      {}
      <Route path="/i/flow/login" element={<LoginPage />} />
      <Route path="/i/flow/logout" element={<LogoutPage />} />

      {}
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="/" element={<Navigate to="/dash" replace />} />

        <Route path="/dash" element={<DashboardPage />} />
        <Route path="/dash/account" element={<AccountPage />} />
        <Route path="/dash/account/transfer" element={<TransferPage />} />
        <Route path="/dash/account/history" element={<HistoryPage />} />
        <Route path="/dash/links" element={<LinksPage />} />
        <Route path="/dash/links/claim" element={<ClaimLinkPage />} />
        <Route path="/dash/statements" element={<StatementsPage />} />
        <Route path="/dash/cards" element={<CardsPage />} />

        <Route path="/i/leaderboard" element={<LeaderboardPage />} />
        <Route path="/i/team" element={<TeamPage />} />
        <Route path="/i/release_notes" element={<ReleaseNotesPage />} />
        <Route path="/i/transaction/:id" element={<TransactionPage />} />

        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/i/flow/mci" element={<CLIPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}