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

  if (!active) {
    return <Navigate to="/i/flow/login" replace />;
  }

  function accept() {
    storageSet(KEYS.ONBOARD, 1);
    navigate('/dash', { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: 520, width: '100%' }}>
        <h1 style={{ marginTop: 0 }}>Welcome to the MyPayIndia PWA</h1>
        <p>
          This is an experimental progressive web app/alternative client for MyPayIndia.
          This app is still in an early state, so please keep in mind:
        </p>
        <ul>
          <li>
            This is not a substitute for{' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            and does not take precedence over it
          </li>
          <li>
            Not everything that can be performed on{' '}
            <a href="https://mypayindia.com" target="_blank" rel="noreferrer">MyPayIndia.com</a>{' '}
            can be performed here
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
            <strong>This app is not complete and still an early work in progress</strong>
          </li>
          <li>
            This app was recently fully remade in React. You might be looking for the legacy web app. <a href="https://legacy.app.mypayindia.com" target="_blank" rel="noopener noreferrer">You can find it here <ExternalIcon size={14} /></a>
          </li>
        </ul>
        <button onClick={accept} style={{ width: '100%', marginTop: '8px' }}>
          Got it, let's go
        </button>
        <a href="https://legacy.app.mypayindia.com" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', marginTop: '8px' }}>
          <button className="secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} type="button">
            Legacy web app <ExternalIcon size={14} />
          </button>
        </a>
        <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', marginTop: '8px' }}>
          <button className="secondary" style={{ width: '100%' }} type="button">
            Go back to MyPayIndia.com <ExternalIcon size={14} />
          </button>
        </a>
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 24 }}>
          <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer">
            Please submit feedback in the Discord server, mentioning @exerinity
          </a><br></br>
          You will not see this again, even after you log out, unless you clear the storage for this app (or visit /i/flow/onboarding lolz)
        </p>
        <AppFooter version={RELEASES[0].version} />
      </div>
    </div>
  );
}
