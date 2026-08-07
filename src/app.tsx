import { Routes, Route, Navigate, Outlet, useLocation, useParams, type Location } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import { useSettings } from './context/settings_ctx.tsx';
import { CardSkeleton } from './components/shell/app_skeleton.tsx';
import { FlowModals, isFlowModalPath } from './flow/flow_conductor.tsx';

const AppLayout = lazy(() => import('./components/shell/app_layout.tsx').then((m) => ({ default: m.AppLayout })));
const RequireAuth = lazy(() => import('./components/shell/require_auth.tsx').then((m) => ({ default: m.RequireAuth })));
const OnboardingPage = lazy(() => import('./flow/pages/onboarding.tsx'));
const DashboardPage = lazy(() => import('./pages/account/dashboard.tsx'));
const AccountPage = lazy(() => import('./pages/account/account.tsx'));
const CardsPage = lazy(() => import('./pages/scambait/cards.tsx'));
const TransferPage = lazy(() => import('./pages/transfer/regular.tsx'));
const BulkTransferPage = lazy(() => import('./pages/transfer/bulk.tsx'));
const HistoryPage = lazy(() => import('./pages/account/history.tsx'));
const SimpleHistoryPage = lazy(() => import('./pages/account/simple_history.tsx'));
const StatementsPage = lazy(() => import('./pages/scambait/statements.tsx'));
const OldTransactionPage = lazy(() => import('./pages/account/old_transaction.tsx'));
const LinksPage = lazy(() => import('./flow/pages/links.tsx'));
const LeaderboardPage = lazy(() => import('./pages/information/leaderboard.tsx'));
const TeamPage = lazy(() => import('./pages/information/team.tsx'));
const TeamMapPage = lazy(() => import('./pages/information/team_map.tsx'));
const NewsPage = lazy(() => import('./pages/information/news.tsx'));
const NewsItemPage = lazy(() => import('./pages/information/news_item.tsx'));
const SubscriptionsPage = lazy(() => import('./flow/pages/subscriptions.tsx'));
const SettingsPage = lazy(() => import('./pages/settings/settings_index.tsx'));
const SessionsPage = lazy(() => import('./flow/pages/sessions.tsx'));
const IotmButtonPage = lazy(() => import('./pages/iotm/button.tsx'));
const IOTMPage = lazy(() => import('./pages/iotm/index.tsx'));
const CLIPage = lazy(() => import('./pages/pwa/cli.tsx'));
const AgentPage = lazy(() => import('./flow/pages/agent.tsx'));
const ChatPage = lazy(() => import('./flow/pages/converse.tsx'));
const MPTIPage = lazy(() => import('./flow/pages/toys.tsx'));
const ReleaseNotesPage = lazy(() => import('./pages/information/release_notes.tsx'));
const AcknowledgementsPage = lazy(() => import('./pages/information/acknowledgements.tsx'));
const HowPwaPage = lazy(() => import('./pages/information/how_pwa.tsx'));
const PrivacyPage = lazy(() => import('./pages/information/privacy.tsx'));
const RestrictionsPage = lazy(() => import('./pages/account/restrictions.tsx'));
const ConnectionPage = lazy(() => import('./flow/pages/connection.tsx'));
const ThemeApplyPage = lazy(() => import('./flow/pages/theme_apply.tsx'));
const SettingsApplyPage = lazy(() => import('./flow/pages/settings_apply.tsx'));
const NotFoundPage = lazy(() => import('./pages/pwa/not_found.tsx'));
const Flowback = lazy(() => import('./flow/shell_fallback.tsx'));
const ExternalRedirectPage = lazy(() => import('./pages/pwa/external_redirect.tsx'));

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
  const { id: pathId } = useParams();
  const id = pathId ?? new URLSearchParams(search).get('id');
  return <Navigate to={id ? `/i/flow/transaction/${id}` : '/dash'} replace />;
}

function PayLinkRedirect() {
  const { search } = useLocation();
  const token = new URLSearchParams(search).get('token');
  return <Navigate to={token ? `/i/flow/links/interim/${encodeURIComponent(token)}` : '/account'} replace />;
}

function ClaimLinkRedirect() {
  const { token } = useParams();
  return <Navigate to={`/i/flow/links/interim/${encodeURIComponent(token ?? '')}`} replace />;
}


function ThemeRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/i/flow/theme${search}`} replace />;
}

function MerchantRedirect() {
  const { '*': splat } = useParams();
  return <ExternalRedirectPage to={`https://mypayindia.com/merchant/${splat ?? ''}`} />;
}

function ChatRedirect() {
  const { peer } = useParams();
  return <Navigate to={`/i/converse/${peer ?? ''}`} replace />;
}

export default function App() {
  const location = useLocation();
  const bgLoc = (location.state as { backgroundLocation?: Location })?.backgroundLocation;
  const modalPath = isFlowModalPath(location.pathname);

  useEffect(() => { import('./utils/canonical.ts').then(({ setCanonical }) => setCanonical(location.pathname)); }, [location.pathname]);

  return (
    <>
    {(!modalPath || bgLoc) && <Routes location={bgLoc || location}>
      <Route path="/pay/link" element={<PayLinkRedirect />} />

      <Route path="/login" element={<LoginRedirect />} />

      <Route path="/leaderboard" element={<Navigate to="/i/leaderboard" replace />} />
      <Route path="/team" element={<Navigate to="/i/team" replace />} />
      <Route path="/docs" element={<ExternalRedirectPage to="https://mypayindia.com/docs" />} />
      <Route path="/app" element={<ExternalRedirectPage to="https://mypayindia.com/app" />} />
      <Route path="/signup" element={<ExternalRedirectPage to="https://mypayindia.com/auth/register" schnell />} />
      <Route path="/account/transfers" element={<Navigate to="/account/history" replace />} />
      <Route path="/account/transfers/:id" element={<TransactionRedirect />} />
      <Route path="/account/transfers/new" element={<Navigate to="/account/transfer" replace />} />
      <Route path="/account/payment-links" element={<Navigate to="/i/flow/links" replace />} />
      <Route path="/account/subscriptions" element={<Navigate to="/subscriptions" replace />} />
      <Route path="/news" element={<Navigate to="/i/news" replace />} />
      <Route path="/i/flow/agent" element={<Navigate to="/i/clanker" replace />} />
      <Route path="/i/flow/mci" element={<Navigate to="/i/command" replace />} />
      <Route path="/i/flow/mci/focus" element={<Navigate to="/i/command/focus" replace />} />
      <Route path="/i/chat" element={<Navigate to="/i/converse" replace />} />
      <Route path="/i/chat/:peer" element={<ChatRedirect />} />
      <Route path="/auth/logout" element={<Navigate to="/i/flow/logout" replace />} />
      <Route path="/merchant/*" element={<MerchantRedirect />} />
      <Route path="/button" element={<Navigate to="/iotm/button" replace />} />

      <Route element={<Suspense fallback={<CardSkeleton />}><Outlet /></Suspense>}>
        <Route path="/i/flow/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<AppLayout />}>
        <Route path="/" element={<HomeRedirect />} />

        <Route path="/dash" element={<DashboardPage />} />
        <Route path="/i/leaderboard" element={<LeaderboardPage />} />
        <Route path="/i/team" element={<TeamPage />} />
        <Route path="/i/team/globe" element={<TeamMapPage />} />
        <Route path="/i/news" element={<NewsPage />} />
        <Route path="/i/news/:slug" element={<NewsItemPage />} />
        <Route path="/i/release_notes" element={<ReleaseNotesPage />} />
        <Route path="/settings" element={<Navigate to="/settings/appearance" replace />} />
        <Route path="/settings/sessions" element={<Navigate to="/i/flow/sessions" replace />} />
        <Route path="/settings/:category" element={<SettingsPage />} />
        <Route path="/settings:old" element={<Flowback />} />
        <Route path="/i/acknowledgements" element={<AcknowledgementsPage />} />
        <Route path="/i/how_pwa" element={<HowPwaPage />} />
        <Route path="/i/privacy" element={<PrivacyPage />} />
        <Route path="/i/flow/scambaitmode" element={<Navigate to="/settings/scambait" replace />} />
        <Route path="/i/flow/connection" element={<ConnectionPage />} />
        <Route path="/i/flow/theme" element={<ThemeApplyPage />} />
        <Route path="/i/flow/settings" element={<SettingsApplyPage />} />
        <Route path="/theme" element={<ThemeRedirect />} />

        <Route path="/i/command" element={<CLIPage />} />
        <Route path="/i/command/focus" element={<CLIPage />} />
        <Route path="/i/flow/mpti" element={<MPTIPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/restrictions" element={<RestrictionsPage />} />
          <Route path="/account/transfer" element={<TransferPage />} />
          <Route path="/account/transfer/bulk" element={<BulkTransferPage />} />
          <Route path="/account/history" element={<HistoryPage />} />
          <Route path="/account/history/simple" element={<SimpleHistoryPage />} />
          <Route path="/i/flow/sessions" element={<SessionsPage />} />
          <Route path="/i/clanker" element={<AgentPage />} />
          <Route path="/i/converse" element={<ChatPage />} />
          <Route path="/i/converse/:peer" element={<ChatPage />} />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/i/flow/links" element={<LinksPage />} />
          <Route path="/i/flow/links/claim" element={<Navigate to="/i/flow/links" replace />} />
          <Route path="/i/flow/links/claim/:token" element={<ClaimLinkRedirect />} />
          <Route path="/links" element={<Navigate to="/i/flow/links" replace />} />
          <Route path="/links/claim" element={<Navigate to="/i/flow/links" replace />} />
          <Route path="/links/claim/:token" element={<ClaimLinkRedirect />} />
          <Route path="/dash/statements" element={<StatementsPage />} />
          <Route path="/dash/cards" element={<CardsPage />} />
          <Route path="/i/flow/button" element={<Navigate to="/iotm/button" replace />} />
          <Route path="/iotm/button" element={<IotmButtonPage />} />
          <Route path="/iotm" element={<IOTMPage />} />
          <Route path="/i/flow/transaction:old/:id" element={<OldTransactionPage />} />
        </Route>

        <Route path="/i/flow/*" element={<Flowback />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>}
    <FlowModals />
    </>
  );
}
