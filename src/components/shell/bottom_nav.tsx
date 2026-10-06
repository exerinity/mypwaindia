import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { resolveNavItems, activeNavRoute } from './nav_catalog.tsx';
import type { NavDestination } from './nav_catalog.tsx';
import { useMediaQuery } from '../../hooks/media_query.ts';
import { bottom_nav_classes } from '../../styles/bottom_nav.stylex.ts';

export const BOTTOM_NAV_QUERY = '(max-width: 900px)';

const EXIT_DURATION = 300;

interface PillBox { x: number; y: number; width: number; height: number; instant: boolean }

export function BottomNavPreview({ items, labels = true }: { items: NavDestination[]; labels?: boolean }) {
  return (
    <div className={`mpi-bottom-nav-preview${labels ? '' : ' mpi-bottom-nav--bare'} ${bottom_nav_classes.preview}`} aria-hidden="true">
      {items.length === 0 ? (
        <span className={`mpi-bottom-nav-preview-empty ${bottom_nav_classes.preview_empty}`}>Nothing to show</span>
      ) : (
        items.map((item, i) => {
          const Icon = item.icon;
          return (
            <span key={item.route} className={`mpi-bottom-nav-item${i === 0 ? ' active' : ''} ${i === 0 ? bottom_nav_classes.item_preview_active : bottom_nav_classes.item_preview}`}>
              <span className={`mpi-bottom-nav-icon ${i === 0 ? (labels ? bottom_nav_classes.icon_preview_active : bottom_nav_classes.icon_preview_active_bare) : labels ? bottom_nav_classes.icon : bottom_nav_classes.icon_bare}`}><Icon size={22} /></span>
              {labels && <span className={`mpi-bottom-nav-label ${bottom_nav_classes.label}`}>{item.short}</span>}
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

  const items = resolveNavItems(settings.bottomNavItems, { active: !!active });
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

  const shown = visible ? items : lastVisibleItems.current;
  const current = activeNavRoute(pathname, shown);
  const layout = shown.map((item) => item.route).join();

  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<PillBox | null>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = (instant: boolean) => {
      const icon = nav.querySelector<HTMLElement>('.mpi-bottom-nav-item.active .mpi-bottom-nav-icon');
      if (!icon) { setPill(null); return; }
      const navBox = nav.getBoundingClientRect();
      const iconBox = icon.getBoundingClientRect();
      setPill((prev) => ({
        x: iconBox.left - navBox.left,
        y: iconBox.top - navBox.top,
        width: iconBox.width,
        height: iconBox.height,
        instant: instant || prev === null,
      }));
    };

    measure(false);
    const onResize = () => measure(true);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [current, layout, settings.bottomNavLabels, visible]);

  if (!visible && !leaving) return null;

  return (
    <nav
      ref={navRef}
      className={`mpi-bottom-nav${leaving ? ' mpi-bottom-nav--leaving' : ''}${settings.bottomNavLabels ? '' : ' mpi-bottom-nav--bare'} ${leaving ? bottom_nav_classes.nav_leaving : bottom_nav_classes.nav}`}
      aria-label="Quick navigation"
    >
      {pill && (
        <span
          className={`mpi-bottom-nav-pill${pill.instant ? ' mpi-bottom-nav-pill--instant' : ''} ${pill.instant ? bottom_nav_classes.pill_instant : bottom_nav_classes.pill}`}
          style={{ transform: `translate(${pill.x}px, ${pill.y}px)`, width: pill.width, height: pill.height }}
          aria-hidden="true"
        />
      )}
      {shown.map((item) => {
        const Icon = item.icon;
        const isCurrent = item.route === current;
        return (
          <NavLink
            key={item.route}
            to={item.route}
            className={() => `mpi-bottom-nav-item${isCurrent ? ' active' : ''} ${isCurrent ? bottom_nav_classes.item_active : bottom_nav_classes.item}`}
            aria-current={isCurrent ? 'page' : undefined}
            title={item.label}
          >
            <span className={`mpi-bottom-nav-icon ${settings.bottomNavLabels ? bottom_nav_classes.icon : bottom_nav_classes.icon_bare}`}><Icon size={22} /></span>
            {settings.bottomNavLabels && <span className={`mpi-bottom-nav-label ${bottom_nav_classes.label}`}>{item.short}</span>}
          </NavLink>
        );
      })}
    </nav>
  );
}
