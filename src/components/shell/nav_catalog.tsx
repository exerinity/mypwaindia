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
  LeaderboardIcon,
  TeamIcon,
  NotesIcon,
  NewspaperIcon,
  SettingsIcon,
  TerminalIcon,
  ButtonIcon,
  AgentIcon,
  ProfilesIcon,
} from '../ui/icons.tsx';

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
  { route: '/i/profiles', label: 'Profiles', short: 'Profiles', icon: ProfilesIcon, hideInScambait: true },
  { route: '/account/profile', label: 'My profile', short: 'Profile', icon: ProfilesIcon, requireAuth: true, hideInScambait: true },
  { route: '/account/shop', label: 'Shop and purchases', short: 'Shop', icon: StoreIcon, requireAuth: true, hideInScambait: true },
  { route: '/i/agent', label: 'MyAgentIndia', short: 'Agent', icon: AgentIcon, requireAuth: true, hideInScambait: true },
  { route: '/account/transfer', label: 'Transfer funds', short: 'Transfer', icon: TransferIcon, requireAuth: true },
  { route: '/account/history', label: 'Transaction history', short: 'History', icon: HistoryIcon, requireAuth: true, hideInScambait: true },
  { route: '/account/history/simple', label: 'Simple history', short: 'Simple', icon: HistoryIcon, requireAuth: true, hideInScambait: true },
  { route: '/account/links', label: 'Payment links', short: 'Links', icon: LinkIcon, requireAuth: true, hideInScambait: true },
  { route: '/subscriptions', label: 'Subscriptions', short: 'Subscriptions', icon: StoreIcon, requireAuth: true, hideInScambait: true },
  { route: '/dash/statements', label: 'Bank statements', short: 'Statements', icon: HistoryIcon, requireAuth: true, scambaitOnly: true },
  { route: '/dash/cards', label: 'Cards', short: 'Cards', icon: CreditCardIcon, requireAuth: true, scambaitOnly: true },
  { route: '/iotm', label: 'Investment Opportunities™', short: 'IO™', icon: TrophyIcon, requireAuth: true, hideInScambait: true },
  { route: '/iotm/button', label: 'The Button', short: 'Button', icon: ButtonIcon, requireAuth: true, hideInScambait: true },
  { route: '/i/leaderboard', label: 'Leaderboard', short: 'Leaderboard', icon: LeaderboardIcon, hideInScambait: true },
  { route: '/i/team', label: 'Meet the team', short: 'Team', icon: TeamIcon, hideInScambait: true },
  { route: '/i/news', label: 'News', short: 'News', icon: NewspaperIcon, hideInScambait: true },
  { route: '/i/release_notes', label: 'App release notes', short: 'Release notes', icon: NotesIcon, hideInScambait: true },
  { route: '/i/command', label: 'MyCLiIndia', short: 'CLi', icon: TerminalIcon, hideInScambait: true },
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
