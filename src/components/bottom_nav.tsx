import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSettings } from '../context/settings_ctx.tsx';
import { useAuth } from '../context/auth_ctx.tsx';
import { resolveNavItems, activeNavRoute } from './nav_catalog.tsx';
import type { NavDestination } from './nav_catalog.tsx';
import { useMediaQuery } from '../hooks/media_query.ts';

export const BOTTOM_NAV_QUERY = '(max-width: 900px)';

const EXIT_DURATION = 300;

export function BottomNavPreview({ items }: { items: NavDestination[] }) {
  return (
    <div className="mpi-bottom-nav-preview" aria-hidden="true">
      {items.length === 0 ? (
        <span className="mpi-bottom-nav-preview-empty">Nothing to show</span>
      ) : (
        items.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={item.route} className={`mpi-bottom-nav-item${i === 0 ? ' active' : ''}`}>
              <span className="mpi-bottom-nav-icon"><Icon size={22} /></span>
              <span className="mpi-bottom-nav-label">{item.short}</span>
            </span>
          );
        })
      )}
    </div>
  );
}

export function BottomNav() {
  const { settings } = useSettings();
  const { active } = useAuth();
  const { pathname } = useLocation();

  const screenFits = useMediaQuery(BOTTOM_NAV_QUERY);

  const items = resolveNavItems(settings.bottomNavItems, { active: !!active, scambait: settings.scambait });
  const visible = settings.bottomNav && (screenFits || settings.bottomNavForce) && items.length > 0;

  const [wasVisible, setWasVisible] = useState(visible);
  const [leaving, setLeaving] = useState(false);
  const lastVisibleItems = useRef(items);

  if (wasVisible !== visible) {
    setWasVisible(visible);
    setLeaving(!visible);
  }

  useEffect(() => {
    if (!leaving) return;
    const timeout = setTimeout(() => setLeaving(false), EXIT_DURATION);
    return () => clearTimeout(timeout);
  }, [leaving]);

  if (visible) lastVisibleItems.current = items;

  if (!visible && !leaving) return null;

  const shown = visible ? items : lastVisibleItems.current;
  const current = activeNavRoute(pathname, shown);

  return (
    <nav
      className={`mpi-bottom-nav${leaving ? ' mpi-bottom-nav--leaving' : ''}`}
      aria-label="Quick navigation"
    >
      {shown.map((item) => {
        const Icon = item.icon;
        const isCurrent = item.route === current;
        return (
          <NavLink
            key={item.route}
            to={item.route}
            className={() => `mpi-bottom-nav-item${isCurrent ? ' active' : ''}`}
            aria-current={isCurrent ? 'page' : undefined}
            title={item.label}
          >
            <span className="mpi-bottom-nav-icon"><Icon size={22} /></span>
            <span className="mpi-bottom-nav-label">{item.short}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
