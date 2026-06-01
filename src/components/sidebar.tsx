import type { ComponentType } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSettings } from '../context/settings_ctx.tsx';
import { Logo } from './logo.tsx';
import {
  CloseIcon,
  CreditCardIcon,
  DashboardIcon,
  UserIcon,
  TransferIcon,
  HistoryIcon,
  LinkIcon,
  ClaimIcon,
  TrophyIcon,
  TeamIcon,
  NotesIcon,
  SettingsIcon,
  ExternalIcon,
  TerminalIcon,
} from './icons.tsx';

interface NavItem { to?: string; href?: string; label: string; end?: boolean; icon: ComponentType<{ size?: number }>; external?: boolean; hideInScambait?: boolean; scambaitOnly?: boolean }
interface NavGroup { title: string; items: NavItem[]; hideInScambait?: boolean; scambaitTitle?: string; defaultTitle?: string }

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Your account',
    items: [
      { to: '/dash', label: 'Dashboard', end: true, icon: DashboardIcon },
      { to: '/account', label: 'Account', icon: UserIcon },
      { to: '/account/transfer', label: 'Transfer funds', icon: TransferIcon },
      { to: '/account/history', label: 'Transaction history', icon: HistoryIcon, hideInScambait: true },
      { to: '/dash/statements', label: 'Bank statements', icon: HistoryIcon, scambaitOnly: true },
      { to: '/dash/cards', label: 'Cards', icon: CreditCardIcon, scambaitOnly: true },
      { to: '/account/iotm', label: 'Investment Opportunities™', icon: TrophyIcon, hideInScambait: true },
    ],
  },
  {
    title: 'Payment links',
    hideInScambait: true,
    items: [
      { to: '/links', label: 'My links', icon: LinkIcon },
      { to: '/links/claim', label: 'Claim a link', icon: ClaimIcon },
    ],
  },
  {
    title: 'Meta',
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
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation();
  const { settings } = useSettings();
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
          <Logo height={32} className="mpi-sidebarlogo" />
          <button className="mpi-sidebarclose-btn" onClick={onClose} aria-label="Close menu">
            <CloseIcon />
          </button>
        </div>
        {NAV_GROUPS.map((group) => {
          if (scambait && group.hideInScambait) return null;

          const visibleItems = group.items.filter((item) => {
            if (scambait && item.hideInScambait) return false;
            if (!scambait && item.scambaitOnly) return false;
            return true;
          });

          if (!visibleItems.length) return null;

          return (
            <div key={group.title}>
              <h4>{scambait && group.scambaitTitle ? group.scambaitTitle : (group.defaultTitle ?? group.title)}</h4>
              <div className="links">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
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
                        <span>{item.label}</span>
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
                      <span>{item.label}</span>
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
