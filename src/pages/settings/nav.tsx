import { useState, lazy } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSettings, BOTTOM_NAV_MAX, DEFAULT_BOTTOM_NAV_ITEMS, normalizeBottomNavItems } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useMediaQuery } from '../../hooks/media_query.ts';
import { pickableDestinations, findDestination, resolveNavItems } from '../../components/nav_catalog.tsx';
import { BottomNavPreview, BOTTOM_NAV_QUERY } from '../../components/bottom_nav.tsx';
import { InfoIcon, ChevronDown, PlusIcon, CloseIcon } from '../../components/icons.tsx';

const ConfirmModal = lazy(() => import('../../components/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));

export function NavSettings() {
  const { settings, update } = useSettings();
  const { active } = useAuth();
  const location = useLocation();
  const screenFitsBottomNav = useMediaQuery(BOTTOM_NAV_QUERY);
  const [bottomNavForceOpen, setBottomNavForceOpen] = useState(false);

  const items = settings.bottomNavItems;
  const options = pickableDestinations(settings.scambait);
  const setItems = (next: string[]) => update({ bottomNavItems: normalizeBottomNavItems(next) });
  const move = (from: number, to: number) => {
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setItems(next);
  };
  const firstUnused = options.find((d) => !items.includes(d.route));
  const preview = resolveNavItems(items, { active: !!active, scambait: settings.scambait });
  const bottomNavLocked = !screenFitsBottomNav && !settings.bottomNavForce;
  const bottomNavOn = settings.bottomNav && !bottomNavLocked;

  return (
    <>
      <h3 className="mt-0">Bottom navigation bar</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 12, marginTop: 0 }}>
        Configure the navigation bar pinned to the bottom of the screen. It can have up to 6 customized buttons and only shows on small screens (unless you manually show it)
      </p>
      <div className="row spread" style={{ alignItems: 'center' }}>
        <span style={{ fontSize: '0.9rem' }}>Show the bottom navigation bar</span>
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={bottomNavOn}
            onChange={(e) => update(e.target.checked ? { bottomNav: true } : { bottomNav: false, bottomNavForce: false })}
            onClick={(e) => {
              if (!bottomNavLocked) return;
              e.preventDefault();
              setBottomNavForceOpen(true);
            }}
          />
          <span className="toggle-track" />
        </label>
      </div>
      {bottomNavOn && (
        <div className="row spread" style={{ alignItems: 'center', marginTop: 12 }}>
          <span style={{ fontSize: '0.9rem' }}>Show labels under the icons</span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={settings.bottomNavLabels}
              onChange={(e) => update({ bottomNavLabels: e.target.checked })}
            />
            <span className="toggle-track" />
          </label>
        </div>
      )}

      <hr style={{ margin: '16px 0', borderColor: 'var(--border)' }} />
      <h3 className="mt-0">Edit navigation buttons</h3>
      <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 12, marginTop: 0 }}>
        You can have up to {BOTTOM_NAV_MAX} destinations.
      </p>
      <p className="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic', margin: '0 0 6px' }}>Preview</p>
      <div style={{ marginBottom: 16 }}>
        <BottomNavPreview items={preview} labels={settings.bottomNavLabels} />
      </div>
      {items.map((route, i) => {
        const dest = findDestination(route);
        const listed = options.some((opt) => opt.route === route);
        return (
          <div key={route} className="row gap-sm" style={{ marginTop: 6, alignItems: 'center', flexWrap: 'nowrap' }}>
            <select
              value={route}
              style={{ flex: 1, minWidth: 0 }}
              aria-label={`Bottom navigation item ${i + 1}`}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                setItems(next);
              }}
            >
              {!listed && <option value={route}>{dest?.label ?? route}</option>}
              {options.map((opt) => (
                <option key={opt.route} value={opt.route} disabled={opt.route !== route && items.includes(opt.route)}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              className="btn ghost"
              style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            >
              <span style={{ display: 'flex', transform: 'rotate(180deg)' }}><ChevronDown size={16} /></span>
            </button>
            <button
              className="btn ghost"
              style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
              aria-label="Move down"
              disabled={i === items.length - 1}
              onClick={() => move(i, i + 1)}
            >
              <ChevronDown size={16} />
            </button>
            <button
              className="btn ghost"
              style={{ padding: '0 6px', lineHeight: 0, flexShrink: 0 }}
              aria-label="Remove item"
              onClick={() => setItems(items.filter((_, j) => j !== i))}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        );
      })}
      <div className="row gap-sm" style={{ marginTop: 10 }}>
        {items.length < BOTTOM_NAV_MAX && firstUnused && (
          <button
            className="btn secondary row gap-sm"
            onClick={() => setItems([...items, firstUnused.route])}
          >
            <PlusIcon size={16} /> Add item
          </button>
        )}
        <button
          className="btn ghost"
          onClick={() => setItems([...DEFAULT_BOTTOM_NAV_ITEMS])}
        >
          Reset to defaults
        </button>
      </div>
      {!active && items.some((r) => findDestination(r)?.requireAuth) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="alert alert-info">
          <InfoIcon />
          <span>Some selected destinations need you to be logged in. They will be hidden until you <Link to="/i/flow/login" state={{ backgroundLocation: location }}>log in</Link></span>
        </div>
      )}

      <ConfirmModal
        title="Show navigation bar?"
        open={bottomNavForceOpen}
        onClose={() => setBottomNavForceOpen(false)}
        onConfirm={() => {
          update({ bottomNav: true, bottomNavForce: true });
          setBottomNavForceOpen(false);
        }}
        danger={false}
        confirmLabel="Yes, show it"
        message="Really show the bottom navigation bar? Your screen doesn't really need nor fit it..."
      />
    </>
  );
}
