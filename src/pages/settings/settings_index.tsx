import { ContentSkeleton } from '../../components/app_skeleton.tsx';
import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RELEASES } from '../information/release_notes.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { ExternalIcon, ArrowLeftIcon, ChevronRight } from '../../components/icons.tsx';
import { usePageTitle } from '../../hooks/page_title.js';
import { CATEGORIES } from './categories.ts';
import type { CategoryId } from './categories.ts';
import { AppearanceSettings } from './appearance.tsx';
import { HomeSettings } from './home.tsx';
import { NavSettings } from './nav.tsx';
import { DataSettings } from './data.tsx';
import { LockSettings } from './lock.tsx';
import { PortSettings } from './port.tsx';
import { SwSettings } from './sw.tsx';
import { ScambaitSettings } from './scambait.tsx';
import Flowback from '../../flow/shell_fallback.tsx';

const AppFooter = lazy(() => import('../../components/app_footer.tsx').then((m) => ({ default: m.AppFooter })));

export default function SettingsPage() {
  const { category } = useParams<{ category: string }>();
  const matchedCategory = CATEGORIES.find((c) => !c.href && c.id === category);
  const isUnknownCategory = !!category && !matchedCategory;
  const activeCategory = (matchedCategory?.id ?? 'appearance') as CategoryId;
  const activeCat = CATEGORIES.find((c) => !c.href && c.id === activeCategory)!;

  usePageTitle(activeCat.label + ' / Settings');

  const { settings } = useSettings();
  const { active } = useAuth();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((c) => {
      if (c.authRequired && !active) return false;
      if (c.hideWhenScambait && settings.scambait) return false;
      return true;
    });
  }, [active, settings.scambait]);

  function renderDetail() {
    if (isUnknownCategory) return <Flowback />;

    switch (activeCategory) {
      case 'appearance': return <AppearanceSettings />;
      case 'home': return <HomeSettings />;
      case 'nav': return <NavSettings />;
      case 'port': return <PortSettings />;
      case 'data': return <DataSettings />;
      case 'lock': return <LockSettings />;
      case 'sw': return <SwSettings />;
      case 'scambait': return <ScambaitSettings />;
      default: return null;
    }
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <div className="mpi-settings-layout">

        <div className={`mpi-settings-nav${mobileShowDetail ? ' mpi-settings-nav--hidden' : ''}`}>
          <div className="mpi-settings-nav-header">
            <h1>Settings</h1>
          </div>

          <div className="mpi-settings-nav-list">
            {visibleCategories.length === 0 && (
              <p style={{ padding: '16px 20px', color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
                No results
              </p>
            )}
            {visibleCategories.map((cat) =>
              cat.href ? (
                <a
                  key={cat.id}
                  href={cat.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mpi-settings-nav-item"
                  title={cat.desc}
                >
                  <span className="mpi-settings-nav-item-label">{cat.label}</span>
                  <span className="mpi-settings-nav-item-chevron"><ExternalIcon size={14} /></span>
                </a>
              ) : (
                <Link
                  key={cat.id}
                  to={cat.to ?? `/settings/${cat.id}`}
                  state={cat.id === 'sessions' ? { from: 'settings' } : undefined}
                  className={`mpi-settings-nav-item${!cat.to && activeCategory === cat.id ? ' active' : ''}`}
                  title={cat.desc}
                  onClick={() => setMobileShowDetail(true)}
                >
                  <span className="mpi-settings-nav-item-label">{cat.label}</span>
                  <span className="mpi-settings-nav-item-chevron"><ChevronRight size={16} /></span>
                </Link>
              )
            )}
          </div>

          {!settings.scambait && (
            <div className="mpi-settings-nav-footer">
              <AppFooter version={RELEASES[0].version} />
            </div>
          )}
        </div>

        <div className={`mpi-settings-detail${mobileShowDetail ? ' mpi-settings-detail--visible' : ''}`}>
          <div className="mpi-settings-detail-header">
            <button
              className="mpi-settings-detail-back"
              onClick={() => setMobileShowDetail(false)}
              aria-label="Back to settings list"
            >
              <ArrowLeftIcon size={18} />
            </button>
            <span>{isUnknownCategory ? 'What' : activeCat.label}</span>
          </div>

          <div className="mpi-settings-detail-scroll">
            <div className="mpi-settings-detail-content">
              {renderDetail()}
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
