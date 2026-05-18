import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { usePageTitle } from '../hooks/page_title.js';

export default function ScambaitPage() {
  usePageTitle('Scambait mode');
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();

  function handleToggle() {
    if (settings.scambait) {
      update({ scambait: false });
    } else if (!active) {
      toast.warning('Log in to enable scambait mode');
    } else {
      update({
        scambait: true,
        ...(settings.displayName === 'username' ? { displayName: 'full_name' } : {}),
      });
    }
  }

  return (
    <>
      <h1 className="mt-0">Scambait mode</h1>

      <div className="card mb-2">
        <h3 className="mt-0">What is scambait mode?</h3>
        <p className="mt-0">Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer is using a mysterious online bank: MyPayIndia.</p>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Okay, what does it change?</h3>
        <ul className="mt-0 mb-0">
          <li>Displays currency as USD ($) instead of INR</li>
          <li>Adds a fake Cards page with plausible card details</li>
          <li>Adds a fake Bank Statements page with realistic transaction history (1000 entries from 2017)</li>
          <li>Adjusts dashboard stats to look more convincing</li>
          <li>Hides the leaderboard and team sections from the sidebar</li>
          <li>Switches the name display to your full name automatically</li>
          <li>Hides payment link controls that would look suspicious to a scammer</li>
        </ul>
        <p className="mt-0">Convincing, right?</p>
      </div>

      <div className="card">
        <div className="row spread" style={{ alignItems: 'center' }}>
          <div>
            <strong>Scambait mode</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.875rem' }}>
              {settings.scambait ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.scambait}
              onChange={handleToggle}
            />
            <span className="toggle-track" />
          </label>
        </div>
      </div>
    </>
  );
}
