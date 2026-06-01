import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { AppFooter } from '../components/app_footer.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { storageSet, KEYS } from '../utils/storage.ts';
import { usePageTitle } from '../hooks/page_title.js';
import { RELEASES } from './release_notes.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { ExternalIcon } from '../components/icons.tsx';

export default function OnboardingPage() {
  usePageTitle('Welcome to the MyPayIndia PWA');
  const { active } = useAuth();
  const navigate = useNavigate();
  const [leaving, setLeaving] = useState(false);

  if (!active) {
    return <Navigate to="/i/flow/login" replace />;
  }

  function accept() {
    storageSet(KEYS.ONBOARD, 1);
    setLeaving(true);
  }

  return (
    <div className={leaving ? 'page-slide-out' : 'page-slide-in'} onAnimationEnd={() => { if (leaving) navigate('/dash', { replace: true }); }} style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
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
            Not everything that can be performed on{' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            can be performed here
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
          <li>
            <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer">
            Please submit feedback in the Discord, @exerinity #dev
          </a>
          </li>
        </ul>
        <button onClick={accept} style={{ width: '100%', marginTop: '8px' }}>
          I understand, let me in!
        </button>
        <AppFooter version={RELEASES[0].version} />
      </div>
    </div>
  );
}
