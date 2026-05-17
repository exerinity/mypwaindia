import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { storageSet, KEYS } from '../utils/storage.ts';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function OnboardingPage() {
  usePageTitle('Welcome');
  const { active } = useAuth();
  const navigate = useNavigate();

  if (!active) {
    navigate('/i/flow/login', { replace: true });
    return null;
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
          This is a new, experimental progressive web app/alternative client for MyPayIndia.
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
            The source code is available at{' '}
            <a href="https://github.com/MyPayIndiaDevs/pwa" target="_blank" rel="noreferrer">
              https://github.com/MyPayIndiaDevs/pwa
            </a>
          </li>
          <li>
            By using this service, you agree to the{' '}
            <a href="https://mypayindia.com/terms" target="_blank" rel="noreferrer">terms and conditions</a>,
            constituted by your initial registration
          </li>
          <li>
            <strong>This app is not complete and still an early work in progress</strong>
          </li>
        </ul>
        <button onClick={accept} style={{ width: '100%', marginTop: '8px' }}>
          Got it, let's go
        </button>
      </div>
    </div>
  );
}
