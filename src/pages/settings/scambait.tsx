import { Link, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { InfoIcon, WarningIcon } from '../../components/ui/icons.tsx';

export function ScambaitSettings() {
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const toast = useToast();
  const location = useLocation();

  function handleScambaitToggle() {
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
      {!active && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
          <InfoIcon />
          <span>To use scambait mode, <Link to="/i/flow/login" state={{ backgroundLocation: location }}>please log in</Link></span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className={`alert ${settings.scambait ? 'alert-warning' : 'alert-info'}`}>
        {settings.scambait ? <WarningIcon /> : <InfoIcon />}
        {settings.scambait
          ? <span>This setting is now hidden. To disable it, come back to <Link to="/settings/scambait">/settings/scambait</Link>.</span>
          : <span>When enabled, this setting will become hidden. Remember its path: <Link to="/settings/scambait">/settings/scambait</Link></span>
        }
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">What is scambait mode?</h3>
        <p className="mt-0">Scambait mode transforms this app into a more convincing-looking interface for use in... scambaiting. Phone scammers often instruct their targets to install remote access software and navigate a banking app - but to their dismay, that geriatric geezer on the other end is using a mysterious online bank: MyPayIndia.</p>
      </div>

      <div className="card mb-2">
        <h3 className="mt-0">Okay, what does it do?</h3>
        <ul className="mt-0 mb-0">
          <li>Displays currency as USD ($) instead of INR</li>
          <li>Adds a fake Cards page with plausible card details</li>
          <li>Adds a fake Bank Statements page with realistic transaction history (1000 entries from 2017) - this page will override the actual transaction history</li>
          <li>Adjusts dashboard stats to look more convincing</li>
          <li>Switches the name display to your full name automatically</li>
          <li>Hides the payment links views &amp; meta pages (i.e. leaderboard, CLi, release notes, meet the team, etc.) that would look suspicious to a scammer</li>
        </ul>
        <p>Convincing, right?</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-error">
          <span>This is meant to be used against malicious activity. <strong>Do not use this <em>for</em> malicious activity.</strong></span>
        </div>
      </div>

      <div className="card">
        <div className="row spread" style={{ alignItems: 'center' }}>
          <div>
            <strong>Scambait mode</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.875rem' }}>
              {!active ? 'Log in to enable' : settings.scambait ? 'Enabled' : 'Disabled'}
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.scambait}
              onChange={handleScambaitToggle}
              disabled={!active}
            />
            <span className="toggle-track" />
          </label>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-success">
          <span>You should create a bespoke account for actually scambaiting with a full convincing name, and not use your main account.</span>
        </div>
        <p className="mb-0">You can also enable scambait mode by:</p>
        <ul className="mt-0">
          <li>Pressing <strong>Ctrl+Alt+B</strong></li>
          <li>Running &quot;scambait&quot; in <Link to="/i/command">MyCLiIndia</Link></li>
          <li>Middle-clicking the <strong>Reset settings</strong> button 5 times</li>
          <li>Holding <strong>Ctrl+Enter</strong> when logging in</li>
        </ul>
      </div>
    </>
  );
}
