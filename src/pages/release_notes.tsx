import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AppFooter } from '../components/app_footer.tsx';
import { usePageTitle } from '../hooks/page_title.js';
import { InfoIcon, StopIcon } from '../components/icons.tsx';

type Release = {
  version: string;
  date: string;
  notes: (string | React.ReactElement)[];
  subnotes?: (string | React.ReactElement)[];
  disclaimer?: string | React.ReactElement;
};

export const RELEASES: Release[] = [
  {
    version: '12',
    date: '24 May 2026',
    notes: [
      'Again, removed the local Investment Opportunities™ page, I got so close this time...',
      <>Revamped <Link to="/settings">the settings page</Link></>,
      <>Added a new setting: <Link to="/settings/home">home screen</Link>, which... changes the home screen</>,
      <>However, <Link to="/i/flow/button">the button has been added</Link>!</>
    ]
  },
  {
    version: '11',
    date: '22 May 2026',
    notes: [
      <>Retrying <Link to="/i/invest">the local Investment Opportunities™ page</Link></>
    ]
  },
  {
    version: '10b',
    date: '20 May 2026',
    notes: [
      <>Added a rudimental <Link to="/i/flow/connection">connection helper</Link> and offline banner</>,
      <>Refreshed the <Link to="/links/claim">claim payment link</Link> page</>,
      'Tables in the transaction history and account session list are now sortable by clicking on the column headers',
      'Added a Remove all button to the payment links page to nullify all active links',
      'Removed the animations from the team page'
    ]
  },
  {
    version: '10a',
    date: '18 May 2026',
    disclaimer: 'This was mostly a behind the scenes update. In spite of that, here are the major changes:',
    notes: [
      <>Added some really wacky animations and shit that I'll probably remove later; to some buttons, modals, <Link to="/i/team">the team page</Link>, and the account switcher dropdown</>,
      <>Added a <Link to="/i/flow/scambaitmode">discrete scambait mode page</Link></>,
      <>Added a <Link to="/account/restrictions">discrete restrictions page</Link></>,
      'Added many redirects to mirror the main website, so for example, visiting /accountservices/dashboard (from the main website) will take you to the dashboard (backward compatibility or whateverrr)',
      'Made icons for alert boxes',
      <>Overhauled <Link to="/account/transfer">the transfer page</Link> and the <Link to="/links">payment links page</Link></>,
      'Replaced most loading messages w/ spinners with skeleton shimmer'
    ]
  },
  {
    version: '10',
    date: '12 May 2026',
    notes: [
      <>Introducing <Link to="/i/flow/mci">MyCLiIndia</Link>!</>,
      'Added a splash screen',
      <>Added <Link to="/i/flow/onboarding">an onboarding flow</Link> and an <Link to="/i/acknowledgements">acknowledgements page</Link></>
    ]
  },
  {
    version: '9',
    date: '11 May 2026',
    notes: [
      'Staging environment support: right-click the Log in button to authenticate against staging instead of production',
      'The environment (production/staging) is stored per account and shown in the Settings accounts table',
      'Account switcher improvement: login/switching now does a full page reload after signing in, fixing stale states',
    ],
  },
  {
    version: '8b',
    date: '9 May 2026',
    notes: [
      'The "Dark" theme has been changed to "Dim" and "Dark" is now a lights out theme',
      'Adjustments to scambait mode: the entire "MyPayIndia" section in the sidebar (rather than just team & leaderboard) are now hidden',
      'Pages intended for scambait mode now no longer display if scambait mode is off',
      'Refreshed the <noscript> box (you\'ll probably not notice this)'
    ]
  },
  {
    version: '8a',
    date: '8 May 2026',
    notes: [
      'Fixed a typo on the transfer page',
      'Parent buttons (like the Account button when you are in Transfer) now dim slightly',
      'Corrected currency formatting',
      'Added more bugs to fix later'
    ]
  },
  {
    version: '8',
    date: '7 May 2026',
    notes: [
      'Completely remade in React',
      'New scambait mode: a fake Cards page, Statements page, and more',
      <><a href="https://legacy.app.mypayindia.com/" target="_blank" rel="noopener noreferrer">The old version</a> is still available!</>,
    ],
  },
  {
    version: '7a',
    date: '16 Apr 2026',
    notes: ['Added an Install view with instructions for installing the PWA on various platforms'],
  },
  {
    version: '7',
    date: '14 Apr 2026',
    notes: ['Redesign most of the UI!', 'Added account switcher'],
  },
  {
    version: '6',
    date: '8 Apr 2026',
    notes: [
      'Renamed Create payment link to Payment links',
      'Added a list of payment links, with a cancel all button',
      'Added a new Claim payment link view',
      'Deprecated Lookup link, forecast removing it in v7',
    ],
  },
  {
    version: '5b',
    date: '4 Apr 2026',
    notes: [
      'The team view now loads data from a live endpoint (nothing different, really)',
      'You can now choose the app to display only your first name in settings; so by username, full name, or first name',
    ],
  },
  {
    version: '5a',
    date: '2 Apr 2026',
    notes: [
      'Added recent contacts to the transfer view',
      <>Minified the code; the full version is still available on the <a href="https://github.com/MyPayIndiaDevs/pwa" target="_blank" rel="noopener noreferrer">GitHub repo</a></>,
    ],
  },
  {
    version: '5',
    date: '30 Mar 2026',
    notes: ['Added an accent color modifier to settings'],
  },
  {
    version: '4b',
    date: '19 Mar 2026',
    notes: [
      'Updated money generator > investment opportunities links',
      'Removed footer and moved its contents to the menu',
    ],
  },
  {
    version: '4a',
    date: '12 Mar 2026',
    notes: [
      'Added a Remember option to the login form',
      'Added delete data buttons to settings',
    ],
  },
  {
    version: '4',
    date: '12 Mar 2026',
    notes: [
      'Added an option (on by default) to automatically refresh data every 30 seconds to Settings',
      'Changed currency formatting from en-IN to en-US (but the Rupee symbol is still used)',
      'The Dark mode and More items toggles in the sidebar have been moved to Settings',
      'The two pills at the top are now both hidden on mobile',
      'Extremely long balances are now truncated on the dashboard view (you can still see the full balance by going to Account info)',
    ],
  },
  {
    version: '3a',
    date: '9 Mar 2026',
    notes: ['Added a new Meet the team view'],
    subnotes: [
      'The Logged in as pill now shows "Loading..." during session check',
      'The Balance pill is now hidden if you are not logged in',
      'Both pills are hidden on the onboarding view',
    ],
  },
  {
    version: '3',
    date: '1 Mar 2026',
    notes: [
      'Added a new Settings view accessible in the menu that, as of now, allows you to change your display name in the app from real name or username',
      'Removed the money generator view, it didn\'t work',
    ],
    subnotes: ['Updated some styling to look better, and also, the onboarding message'],
  },
  {
    version: '2a',
    date: '21 Feb 2026',
    notes: [
      'Moved App release notes from Your account to Meta in the menu',
      'Added the money generator',
    ],
  },
  {
    version: '2',
    date: '21 Feb 2026',
    notes: [
      'Added a new transaction details view, click on a transaction on the dashboard or bespoke list! (/history)',
      'Added a new account information view, accessible from the menu or when clicking on the username in the topbar!',
    ],
  },
  {
    version: '1',
    date: '14 Feb 2026',
    notes: ['App launches to app.mypayindia.com'],
  },
  {
    version: '0 (pre-release)',
    date: '7 Feb 2026',
    notes: [
      'App inception',
      'Added a leaderboard, login flow, payment link creator, transaction history, and a basic dashboard',
    ],
  },
];

function ReleaseItem({ r, borderBottom }: { r: Release; borderBottom: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: borderBottom ? '1px solid var(--border)' : 'none', padding: '4px 0' }}>
      <button
        className="release-summary"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <strong>Version {r.version}</strong>
        <span className="muted" style={{ fontSize: '0.85rem' }}>{r.date}</span>
      </button>
      <div className={`release-body${open ? ' open' : ''}`}>
        <div className="release-body-inner">
          {r.disclaimer && (
            <p className="muted" style={{ fontSize: '0.8rem', margin: '6px 0 4px' }}>{r.disclaimer}</p>
          )}
          <ul style={{ marginTop: 6, marginBottom: 10 }}>
            {r.notes.map((note, j) => <li key={j}>{note}</li>)}
          </ul>
          {r.subnotes && (
            <small>
              <ul style={{ marginBottom: 10 }}>
                {r.subnotes.map((n, j) => <li key={j}>{n}</li>)}
              </ul>
            </small>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReleaseNotesPage() {
  usePageTitle('Release notes');
  return (
    <>
      <h1 className="mt-0">Release notes</h1>
      <p className="mt-0 mb-0">See what's happening on the MyPayIndia PWA. We're constantly working to make the MyPayIndia PWA a world-class experience. We hope you enjoy reading about our work!
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info"><InfoIcon /><span>Not every change is documented here. The app may receive minor changes without documentation.</span></div>
      <div className="card">
        <p className="mt-0 mb-0">There are {RELEASES.length} releases to show:</p>
        {RELEASES.map((r, i) => (
          <ReleaseItem key={r.version} r={r} borderBottom={i < RELEASES.length - 1} />
        ))}
      </div>
      <AppFooter version={RELEASES[0].version} />
    </>
  );
}
