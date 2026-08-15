import React from 'react';
import { Link } from 'react-router-dom';

export type Release = {
  version: string;
  date: string;
  notes: (string | React.ReactElement | { h2: string | React.ReactElement } | { h3: string | React.ReactElement } | { p: string | React.ReactElement })[];
  subnotes?: (string | React.ReactElement)[];
  disclaimer?: string | React.ReactElement;
};

export const RELEASES: Release[] = [
  {
    version: '23',
    date: '9 Aug 2026',
    notes: [
      <>Added an elementary <Link to="/i/drive">portal for MyDriveIndia</Link></>
    ]
  },
  {
    version: '22a',
    date: '9 Aug 2026',
    notes: [
      { h3: 'Clanker and Converse have been completely removed'},
      'That didn\'t last long... but I don\'t really see how either of those were relevant to literally anything, all it really did was overburden myself with more shit. Anyone who subscribed to Clanker has been issued a full refund.',
      { h3: 'Other stuff' },
      'When viewing a payment link logged out, clicking "Log in to claim" should now actually bring you back to the interstitial after logging in'
    ]
  },
  {
    version: '22',
    date: '6 Aug 2026',
    notes: [
      { h3: 'Big stuff' },
      <>New: <Link to="/i/clanker">MyPWAIndia Clanker preview</Link>, which can do tasks akin to MyCLiIndia, only with a conversational large language model. You can chat with it, it can execute commands for you, and it's also really wonky right now. Oh, and you gotta cough up some Innovative Rupees</>,
      <>New: <Link to="/i/converse">MyPWAIndia Converse</Link>. This was an experiment on its own two legs that lasted about a week and I mushed and frankensteined it into the PWA. For now, you can't really do much except send texts to other enrolled users. No paywall on this one</>,
      { p: <>These two services are entirely independent of MyPayIndia and run on the PWA backend. Also, these two services have new drawers which you can activate in <Link to="/settings/appearance">appearance settings</Link></> },
      { h3: 'Other stuff' },
      'Categories in the sidebar can now be collapsed and expanded',
      <>MyCLiIndia has moved from <a>/i/flow/mci</a> to <Link to="/i/command">/i/command</Link></>
    ]
  },
  {
    version: '21a',
    date: '2 Aug 2026',
    notes: [
      <>Added <Link to="/i/news">news page</Link></>
    ]
  },
  {
    version: '21',
    date: '1 Aug 2026',
    notes: [
      <>Remade the custom theme editor in <Link to="/settings/appearance">appearance settings</Link></>
    ]
  },
  {
    version: '20',
    date: '29 July 2026',
    notes: [
      <>Added a drawer for MyCLiIndia, <Link to="/settings/appearance">that can be enabled here</Link></>,
      'Added a command to MyCLiIndia, "fly", which toggles between the drawer and the main page'
    ],
    subnotes: [
      "This is another idea stolen from the Twitter web app please don't kill me X Corporation of the United States of America"
    ]
  },
  {
    version: '19',
    date: '27 Jul 2026',
    notes: [
      { h3: 'Some mobile care' },
      <>Added a <Link to="/account/history/simple">simple history</Link> page</>,
      <>Added a new bottom navigation bar with up to 6 destinations you pick yourself <Link to="/settings/nav">here</Link> (turn it off there too)</>,
      "The manifest and metadata has been buffed to perform better on phones",
      "Installing the app now gives you quick shortcuts on long press and hopefully no more colour flash on launch"
    ]
  },
  {
    version: '18',
    date: '25 Jul 2026',
    notes: [
      <><Link to="/i/flow/mci">MyCLiIndia</Link> has been given a slight refresh to look more like an actual terminal</>,
      "Scambait mode has been improved, especially the statements page",
      "Added a fast-return button to transaction info modals"
    ]
  },
  {
    version: '17a',
    date: '18 Jul 2026',
    notes: [
      <>The payment links category has been removed and moved to a single page: <Link to="/i/flow/links">here</Link></>,
      'Payment links are now inspected and claimed through modals',
      'Migrated most MyPayIndia.com routes and links',
      <>Added a search bar to <Link to="/account/history">the transaction history table</Link></>
    ]
  },
  {
    version: '17',
    date: '12 Jul 2026',
    notes: [
      <>Added <Link to="/i/team/globe">team globe</Link></>
    ]
  },
  {
    version: '16b',
    date: '9 Jul 2026',
    notes: [
      <>The <Link to="/i/team">team page</Link> has been updated to show more stuff</>,
    ],
    subnotes: [
      'css adjustments blah blah'
    ]
  },
  {
    version: '16a',
    date: '6 Jul 2026',
    notes: [
      'MyPWAIndia now uses Twemoji. Everywhere. I don\'t know who\'ll notice, but twemoji is sigma',
      { h2: '🎬🦄🌵🍕🚀🔮🦊🎈🥞🌊🤖🥑🧗‍♀️🎭🥥🪁🦖🎳🍦🎪🛸🥑🦩🧩' },
      'Added a new setting: Keep information in storage. It doesn\'t do much, it only eliminates saving your balance (and other) info in storage, so every load freshly loads numbers'

    ],
    subnotes: [
      'Various adjustments to phrases and wording throughout the app',
      'Various adjustments to the app'
    ],
  },
  {
    version: '16',
    date: '26 Jun 2026',
    notes: [
      <>Added a <Link to="/i/flow/onboarding/wizard">setup wizard</Link> that begins after <Link to="/i/flow/onboarding">onboarding</Link></>,
      <>Added an <Link to="/settings/lock">app locker</Link></>
    ]
  },
  {
    version: '15b',
    date: '18 Jun 2026',
    notes: [
      <><Link to="/iotm/button">The Button</Link> autoclicker can now be activated for free if you correctly answer 5 math equations</>
    ]
  },
  {
    version: '15a',
    date: '16 Jun 2026',
    notes: [
      <>Transaction detail viewer overhauled: it is now a modal with action buttons rather than a full page<br></br>(the old one is still available at <strong>/i/flow/transaction:old/:ID</strong>)</>,
      { 'h3': <><Link to="/account/history">Try it out</Link></> },
      'The login and logout views are now modals'
    ]
  },
  {
    version: '15',
    date: '13 Jun 2026',
    notes: [
      { h3: <><Link to="/iotm/button">The Button changes</Link></> },
      'An autoclicker is now available under a subscription',
      { h3: 'Settings' },
      <>The reinitialize session button in <Link to="/settings/sessions">sessions</Link> now handles 2FA codes</>,
      <>Added a <Link to="/settings/sw">service worker control setting</Link></>,
      <>Added a new <Link to="/settings/port">share settings</Link> page</>,
      <>Added a new <Link to="/settings/home">speed dial setting</Link>, where you can modify the 4 action buttons on the dashboard</>,
      { h3: 'Miscellaneous' },
      'All settings pages now take up the whole container',
      'Compiled scripts have been split up per category and now load lazily',
      <>Added a <Link to="/subscriptions">subscriptions page</Link></>,
      { h3: 'Auto-refresh overhaul' },
      'The dashboard, account, history, payment links, restrictions, and sessions pages now share a single 30-second refresh cycle, cutting down on duplicate/unnecessary network requests',
      'Leaving a page and coming back now shows your last-loaded data instantly instead, while a fresh copy loads in the background',
      'Pages with auto-refresh now show a small "refreshing in Xs" link to manually refresh and reset the timer',
      { h3: 'Scambait mode' },
      <>Added fake routing numbers, account numbers, and SWIFT/BIC codes to <Link to="/dash/cards">cards</Link></>,
      'In Appearance settings, the custom theme promo, the Custom theme option, and the Display name section are now hidden... for legitimacy',
    ]
  },
  {
    version: '14a',
    date: '7 Jun 2026',
    notes: [
      <>Added a new devtools/debug/toys/whatever page: <Link to="/i/flow/mpti">MyPWAToysIndia</Link></>,
      <>Buffed toast notifications: new animations, and hovering over them halts the time to expire</>,
      'Toasts should now show when the app has an update and also after an update offering to show the release notes',
    ]
  },
  {
    version: '14',
    date: '3 Jun 2026',
    notes: [
      { h3: <><Link to="/iotm/button">The Button changes</Link></> },
      'The balance now animates with a slot-machine effect',
      'A faint red dot now appears next to active clickers on the clickerboard (based on snapshot comparisons); click it to learn more or dismiss it',
      'The auto-refresh now pauses while you\'re clicking and shows a countdown ("refreshing in Xs") when idle',
      'Your updated balance now syncs back to the app immediately',
      { h3: <><Link to="/settings">Settings changes</Link></> },
      'Display name setting merged into the Appearance section',
      <>Renamed "Data &amp; sync" to <Link to="/settings/data">Data control</Link> - and added a "Hide stuff" section so you can toggle things you previously dismissed</>,
      <>Added a <Link to="/settings/appearance">custom theme setting</Link> with link sharing</>,
      'Scambait mode and Sessions panels now use the wide layout',
      'Settings nav items now show a tooltip with the category description on hover',
      { h3: 'Miscellaneous' },
      'Unified all "hide this" storage flags under a single key rather than having individual flags',
      <>Added a <Link to="/account/transfer/bulk">bulk transfer page</Link></>
    ],
  },
  {
    version: '13b',
    date: '1 Jun 2026',
    notes: [
      { h3: 'Happy Pride month!', },
      <>The Button has moved to <Link to="/iotm/button">/iotm/button</Link> (old link still redirects)</>,
      <>The <Link to="/i/leaderboard">leaderboard</Link> now auto-refreshes every 10 seconds with a counting-up animation on balances, and a pause/refresh now control</>,
      'The clickerboard on the Button page also auto-refreshes every 10 seconds with the same animation',
      'Added a dismissable "Did you know?" hint on the dashboard about mypayindia.sbs path mapping',
      'Added more redirects: /accountservices/paymentlinks, /accountservices/logout, /accountservices/trans?id=X (deeplinks to a transaction)',
      'Navigating to an unknown settings category now gives you a more... "appropriate" message',
      <>Added an "Add account" modal to the <Link to="/settings/data">saved accounts area</Link> in settings where you can either just add details or normally log in</>,
      <>Added some stats to <Link to="/iotm/button">the button</Link></>,
      'Pride logo added'
    ]
  },
  {
    version: '13a',
    date: '31 May 2026',
    notes: [
      'Most inputs now use a floating label effect - the placeholder text shrinks and moves to the top when a field is focused',
      <>Moved the sessions list from the account view <Link to="/settings/sessions">to settings</Link> with a new dramatic terminate all sessions button</>,
      'Cleaned up some broken styles, especially on mobile: the sidebar now reaches the bottom instead of having a weird cutoff 3/4 the way',
      <>Added some stats to the top of the <Link to="/account/history">transaction history page</Link></>
    ]
  },
  {
    version: '13',
    date: '27 May 2026',
    notes: [
      <>Added a new <Link to="/settings/appearance">custom theme setting</Link></>,
      { h3: 'Some changes to logging in: you can now add parameters to the URL, after /i/flow/login or /login:' },
      <><code>?username=JohnPayment&password=Applesandbananas1&scambait=true&env=staging</code> -- all of these are optional; but if username &amp; password are present, it will automatically log in. Override that with <code>&nologin</code>. The scambait flag can also be provided with just <code>s</code></>,
      'Logging in with scambait mode enabled will skip the onboarding screen'
    ]
  },
  {
    version: '12',
    date: '24 May 2026',
    notes: [
      'Again, removed the local Investment Opportunities™ page, I got so close this time...',
      <>Revamped <Link to="/settings">the settings page</Link></>,
      <>Added a new setting: <Link to="/settings/home">home screen</Link>, which... changes the home screen</>,
      <>However, <Link to="/iotm/button">the button has been added</Link>!</>
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
      <>Refreshed the <Link to="/i/flow/links">claim payment link</Link> page</>,
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
      <>Overhauled <Link to="/account/transfer">the transfer page</Link> and the <Link to="/i/flow/links">payment links page</Link></>,
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
      <><a href="https://legacy.mpi.exerinity.gay/" target="_blank" rel="noopener noreferrer">The old version</a> is still available!</>,
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
