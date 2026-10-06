export type CategoryId =
  | 'appearance'
  | 'home'
  | 'nav'
  | 'data'
  | 'download'
  | 'port'
  | 'sw'
  | 'account'
  | 'lock';

export interface Category {
  id: string;
  label: string;
  desc: string;
  authRequired?: boolean;
  href?: string;
  to?: string;
}

export const CATEGORIES: Category[] = [
  { id: 'appearance', label: 'Appearance', desc: 'Theme and accent color' },
  { id: 'home', label: 'Home screen', desc: 'Default page, dashboard buttons, and transaction history' },
  { id: 'nav', label: 'Bottom navigation', desc: 'The quick navigation bar shown on small screens' },
  { id: 'data', label: 'Data control', desc: 'Edit saved accounts, API settings, and other small settings' },
  { id: 'lock', label: 'App lock', desc: 'Require a PIN, pattern, or password to open the app' },
  { id: 'port', label: 'Share settings', desc: 'Move your settings in or out' },
  { id: 'sw', label: 'Service worker', desc: 'Manage the service worker' },
  { id: 'sessions', label: 'List of sessions', desc: 'View and manage active login sessions', authRequired: true, to: '/i/sessions' },
  { id: 'logout', label: 'Log out', desc: 'Log out of MyPWAIndia', authRequired: true, to: '/logout' },
  { id: 'toys', label: 'Toys', desc: 'Poke around with UI components', to: '/i/debug' },
  { id: 'download', label: 'Download the app', desc: "Download the MyPayIndia app. It's free." },
  { id: 'account', label: 'Account management', desc: 'Manage your account on MyPayIndia.com', href: 'https://mypayindia.com/account/settings' },
  { id: 'mypayindia', label: 'MyPayIndia.com', desc: 'Visit the main website', href: 'https://mypayindia.com' },
];
