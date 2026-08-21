import { useState, lazy, Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { storageGet, storageSet, KEYS } from '../../utils/storage.ts';
import { usePageTitle } from '../../hooks/page_title.js';
import { RELEASES } from '../../pages/information/release_notes.tsx';
import { ExternalIcon } from '../../components/ui/icons.tsx';

const AppFooter = lazy(() => import('../../components/shell/app_footer.tsx').then((m) => ({ default: m.AppFooter })));
const ConfirmModal = lazy(() => import('../../components/ui/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));

export default function OnboardingPage() {
  const { active } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [alreadyAccepted] = useState(() => storageGet<number>(KEYS.ONBOARD, 0) === 1);
  const [showAnyway, setShowAnyway] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(true);
  usePageTitle(alreadyAccepted && !showAnyway ? null : 'Welcome to the MyPayIndia PWA');

  if (!active) {
    return <Navigate to="/i/flow/login" replace />;
  }

  if (alreadyAccepted && !showAnyway) {
    return (
      <Suspense fallback={null}>
        <ConfirmModal
          open={confirmOpen}
          fullscreen
          title="Show the onboarding flow again?"
          message="You've already accepted the onboarding message. Would you like to see it again anyway?"
          confirmLabel="Yeah"
          cancelLabel="Nah"
          danger={false}
          onClose={() => { setConfirmOpen(false); navigate(-1); }}
          onConfirm={() => setShowAnyway(true)}
        />
      </Suspense>
    );
  }

  function accept() {
    storageSet(KEYS.ONBOARD, 1);
    setLeaving(true);
  }

  return (
    <div className={leaving ? 'page-slide-out' : 'page-slide-in'} onAnimationEnd={() => {
      if (!leaving) return;
      navigate('/i/flow/onboarding/wizard', {
        replace: true,
        state: { backgroundLocation: { pathname: '/dash', search: '', hash: '', state: null, key: 'finetune-bg' } },
      });
    }} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ marginTop: 0 }}>Welcome to MyPWAIndia!</h1>
        <p>
          MyPWAIndia is the official responsive web app for using MyPayIndia. Please keep in mind when using MyPWAIndia:
        </p>
        <ul>
          <li>
            This is not (a substitute for){' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            and does not take precedence over it
          </li>
          <li>
            This app is (or should be seen as) completely standalone from the main{' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            website
          </li>
          <li>
            By using this app, you agree to the{' '}
            <a href="https://mypayindia.com/terms" target="_blank" rel="noreferrer">terms and conditions</a>,
            constituted by your initial account registration
          </li>
          <li>
            MyPWAIndia is open source here: <a href="https://github.com/exerinity/mypwaindia" target="_blank" rel="noreferrer">exerinity/mypwaindia</a>
          </li>
          <li>
            <strong>This app is an early work in progress</strong>
          </li>
        </ul>
        <p className="mt-0 mb-0">
          <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer">
            Please submit feedback in the #dev channel in our Discord <ExternalIcon />
          </a>
        </p>
        <button onClick={accept} style={{ width: '100%', marginTop: '8px' }}>
          I understand, let me in!
        </button>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 24, marginBottom: 4 }}>After continuing, a setup wizard will start. You can skip it by just closing it</p>
        <Suspense fallback={null}><AppFooter version={RELEASES[0].version} style={{ marginTop: 4 }} /></Suspense>
      </div>
    </div>
  );
}
