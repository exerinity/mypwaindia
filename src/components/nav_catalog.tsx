import type { ComponentType } from 'react';
import {
  DashboardIcon,
  UserIcon,
  TransferIcon,
  HistoryIcon,
  LinkIcon,
  StoreIcon,
  CreditCardIcon,
  TrophyIcon,
  TeamIcon,
  NotesIcon,
  SettingsIcon,
  TerminalIcon,
  StopIcon,
} from './icons.tsx';

export interface NavDestination {
  route: string;
  label: string;
  short: string;
  icon: ComponentType<{ size?: number }>;
  requireAuth?: boolean;
  hideInScambait?: boolean;
  scambaitOnly?: boolean;
}

export const NAV_DESTINATIONS: NavDestination[] = [
  { route: '/dash', label: 'Dashboard', short: 'Dashboard', icon: DashboardIcon },
  { route: '/account', label: 'Account info', short: 'Account', icon: UserIcon, requireAuth: true },
  { route: '/account/transfer', label: 'Transfer funds', short: 'Transfer', icon: TransferIcon, requireAuth: true },
  { route: '/account/history', label: 'Transaction history', short: 'History', icon: HistoryIcon, requireAuth: true, hideInScambait: true },
  { route: '/account/history/simple', label: 'Simple history', short: 'Simple', icon: HistoryIcon, requireAuth: true, hideInScambait: true },
  { route: '/i/flow/links', label: 'Payment links', short: 'Links', icon: LinkIcon, requireAuth: true, hideInScambait: true },
  { route: '/subscriptions', label: 'Subscriptions', short: 'Subs', icon: StoreIcon, requireAuth: true, hideInScambait: true },
  { route: '/dash/statements', label: 'Bank statements', short: 'Statements', icon: NotesIcon, requireAuth: true, scambaitOnly: true },
  { route: '/dash/cards', label: 'Cards', short: 'Cards', icon: CreditCardIcon, requireAuth: true, scambaitOnly: true },
  { route: '/iotm', label: 'Investment Opportunities™', short: 'Invest', icon: TrophyIcon, requireAuth: true, hideInScambait: true },
  { route: '/iotm/button', label: 'The Button', short: 'Button', icon: StopIcon, requireAuth: true, hideInScambait: true },
  { route: '/i/leaderboard', label: 'Leaderboard', short: 'Ranks', icon: TrophyIcon, hideInScambait: true },
  { route: '/i/team', label: 'Meet the team', short: 'Team', icon: TeamIcon, hideInScambait: true },
  { route: '/i/release_notes', label: 'App release notes', short: 'Notes', icon: NotesIcon, hideInScambait: true },
  { route: '/i/flow/mci', label: 'MyCLiIndia', short: 'CLI', icon: TerminalIcon, hideInScambait: true },
  { route: '/settings', label: 'Settings', short: 'Settings', icon: SettingsIcon },
];

export function findDestination(route: string): NavDestination | undefined {
  return NAV_DESTINATIONS.find((d) => d.route === route);
}

export function pickableDestinations(scambait: boolean): NavDestination[] {
  return NAV_DESTINATIONS.filter((d) => (scambait ? !d.hideInScambait : !d.scambaitOnly));
}

export function resolveNavItems(routes: string[], opts: { active: boolean; scambait: boolean }): NavDestination[] {
  const out: NavDestination[] = [];
  for (const route of routes) {
    const dest = findDestination(route);
    if (!dest) continue;
    if (dest.requireAuth && !opts.active) continue;
    if (opts.scambait ? dest.hideInScambait : dest.scambaitOnly) continue;
    out.push(dest);
  }
  return out;
}

export function activeNavRoute(pathname: string, items: NavDestination[]): string | null {
  let match: string | null = null;
  let best = -1;
  for (const item of items) {
    if (pathname !== item.route && !pathname.startsWith(`${item.route}/`)) continue;
    if (item.route.length > best) {
      best = item.route.length;
      match = item.route;
    }
  }
  return match;
}
