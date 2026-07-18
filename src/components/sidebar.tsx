import type { ComponentType } from 'react';
import { lazy, Suspense } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import {
  CloseIcon,
  CreditCardIcon,
  DashboardIcon,
  UserIcon,
  TransferIcon,
  HistoryIcon,
  LinkIcon,
  TrophyIcon,
  TeamIcon,
  NotesIcon,
  StoreIcon,
  SettingsIcon,
  ExternalIcon,
  TerminalIcon,
} from './icons.tsx';

const Logo = lazy(() => import('./logo.tsx').then((m) => ({ default: m.Logo })));

interface NavItem { to?: string; href?: string; label: string; loggedOutLabel?: string; end?: boolean; icon: ComponentType<{ size?: number }>; external?: boolean; hideInScambait?: boolean; scambaitOnly?: boolean; requireAuth?: boolean }
interface NavGroup { title: string; items: NavItem[]; hideInScambait?: boolean; scambaitTitle?: string; defaultTitle?: string; loggedOutTitle?: string }

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Your account',
    loggedOutTitle: 'Welcome',
    items: [
      { to: '/dash', label: 'Dashboard', loggedOutLabel: 'Welcome', end: true, icon: DashboardIcon },
      { to: '/account', label: 'Account info', icon: UserIcon, requireAuth: true },
      { to: '/account/transfer', label: 'Transfer funds', icon: TransferIcon, requireAuth: true },
      { to: '/account/history', label: 'Transaction history', icon: HistoryIcon, hideInScambait: true, requireAuth: true },
      { to: '/i/flow/links', label: 'Payment links', icon: LinkIcon, hideInScambait: true, requireAuth: true },
      { to: '/i/flow/subscriptions', label: 'Subscriptions', icon: StoreIcon, hideInScambait: true, requireAuth: true },
      { to: '/dash/statements', label: 'Bank statements', icon: HistoryIcon, scambaitOnly: true, requireAuth: true },
      { to: '/dash/cards', label: 'Cards', icon: CreditCardIcon, scambaitOnly: true, requireAuth: true },
      { to: '/iotm', label: 'Investment Opportunities™', icon: TrophyIcon, hideInScambait: true, requireAuth: true },
    ],
  },
  {
    title: 'Meta',
    loggedOutTitle: 'MyPayIndia',
    hideInScambait: true,
    items: [
      { to: '/i/leaderboard', label: 'Leaderboard', icon: TrophyIcon },
      { to: '/i/team', label: 'Meet the team', icon: TeamIcon },
      { to: '/i/release_notes', label: 'App release notes', icon: NotesIcon },
      { href: 'https://mypayindia.com/', label: 'MyPayIndia.com', icon: LinkIcon, external: true },
    ],
  },
  {
    title: 'App management',
    items: [
      { to: '/settings', label: 'Settings', icon: SettingsIcon },
      { to: '/i/flow/mci', label: 'MyCLiIndia', icon: TerminalIcon, hideInScambait: true },
    ],
    scambaitTitle: 'Control',
    defaultTitle: 'MyPWAIndia',
    loggedOutTitle: 'More',
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { settings } = useSettings();
  const { active } = useAuth();
  const scambait = settings.scambait;

  return (
    <>
      <div
        className={`mpi-sidebaroverlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`mpi-sidebar ${open ? 'open' : ''}`} aria-label="Main navigation">
        <div className="mpi-sidebarmobile-header">
          <Suspense fallback={null}>
            <Logo height={32} className="mpi-sidebarlogo" />
          </Suspense>
          <button className="mpi-sidebarclose-btn" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        {NAV_GROUPS.map((group) => {
          if (scambait && group.hideInScambait) return null;

          const visibleItems = group.items.filter((item) => {
            if (item.requireAuth && !active) return false;
            if (scambait && item.hideInScambait) return false;
            if (!scambait && item.scambaitOnly) return false;
            return true;
          });

          if (!visibleItems.length) return null;

          return (
            <div key={group.title}>
              <h4>{!active && group.loggedOutTitle ? group.loggedOutTitle : scambait && group.scambaitTitle ? group.scambaitTitle : (group.defaultTitle ?? group.title)}</h4>
              <div className="links">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const label = !active && item.loggedOutLabel ? item.loggedOutLabel : item.label;
                  if (item.external) {
                    return (
                      <a
                        key={item.href}
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={onClose}
                      >
                        {Icon && <Icon />}
                        <span>{label}</span>
                        <ExternalIcon />
                      </a>
                    );
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to!}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) => {
                        if (!isActive) return '';
                        return location.pathname === item.to ? 'active' : 'active active-parent';
                      }}
                    >
                      {Icon && <Icon />}
                      <span>{label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}

      </aside>
    </>
  );
}
