import { useState, lazy, Suspense } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { storageGet, storageSet, KEYS } from '../utils/storage.ts';
import { usePageTitle } from '../hooks/page_title.js';
import { RELEASES } from './release_notes.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { ExternalIcon } from '../components/icons.tsx';

const AppFooter = lazy(() => import('../components/app_footer.tsx').then((m) => ({ default: m.AppFooter })));
const ConfirmModal = lazy(() => import('../components/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));

export default function OnboardingPage() {
  usePageTitle('Welcome to the MyPayIndia PWA');
  const { active } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);
  const [alreadyAccepted] = useState(() => storageGet<number>(KEYS.ONBOARD, 0) === 1);
  const [showAnyway, setShowAnyway] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(true);

  if (!active) {
    return <Navigate to="/i/flow/login" replace />;
  }

  if (alreadyAccepted && !showAnyway) {
    return (
      <Suspense fallback={null}>
        <ConfirmModal
          open={confirmOpen}
          fullscreen
          title="Just making sure..."
          message="You've already accepted the onboarding message. Would you like to see it again anyway?"
          confirmLabel="Yeah gimme"
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
          This is an experimental progressive web app/alternative client for MyPayIndia.
          Please keep in mind:
        </p>
        <ul>
          <li>
            This is not (a substitute for){' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            and does not take precedence over it
          </li>
          <li>
            Roughly 90% of things can be done here from <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>
          </li>
          <li>
            This app is (or should be seen as) completely standalone from the main{' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            website
          </li>
          <li>
            By using this app, you agree to the{' '}
            <a href="https://mypayindia.com/terms" target="_blank" rel="noreferrer">terms and conditions</a>,
            constituted by your initial registration
          </li>
          <li>
            <strong>This app is still an early work in progress</strong>
          </li>
        </ul>
        <p className="mt-0 mb-0">
          <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer">
            Please submit feedback in the Discord, mentioning @exerinity in the #dev channel <ExternalIcon />
          </a>
        </p>
        <button onClick={accept} style={{ width: '100%', marginTop: '8px' }}>
          Continue
        </button>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 24, marginBottom: 4 }}>After clicking continue, a setup wizard will begin. You can skip it by pressing the X on the modal or skip any step within it</p>
        <Suspense fallback={null}><AppFooter version={RELEASES[0].version} style={{ marginTop: 4 }} /></Suspense>
      </div>
    </div>
  );
}
