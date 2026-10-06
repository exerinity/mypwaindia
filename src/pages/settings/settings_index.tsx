import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { settings_classes } from '../../styles/settings.stylex.ts';
import { useState, useMemo, lazy, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { RELEASES } from '../information/release_notes.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { ExternalIcon, ArrowLeftIcon, ChevronRight } from '../../components/ui/icons.tsx';
import { usePageTitle } from '../../hooks/page_title.js';
import { CATEGORIES } from './categories.ts';
import type { CategoryId } from './categories.ts';
import { AppearanceSettings } from './appearance.tsx';
import { HomeSettings } from './home.tsx';
import { NavSettings } from './nav.tsx';
import { DataSettings } from './data.tsx';
import { DownloadSettings } from './download.tsx';
import { LockSettings } from './lock.tsx';
import { PortSettings } from './port.tsx';
import { SwSettings } from './sw.tsx';
import Flowback from '../../flow/shell_fallback.tsx';

const AppFooter = lazy(() => import('../../components/shell/app_footer.tsx').then((m) => ({ default: m.AppFooter })));

export default function SettingsPage() {
  const { category } = useParams<{ category: string }>();
  const matchedCategory = CATEGORIES.find((c) => !c.href && c.id === category);
  const isUnknownCategory = !!category && !matchedCategory;
  const activeCategory = (matchedCategory?.id ?? 'appearance') as CategoryId;
  const activeCat = CATEGORIES.find((c) => !c.href && c.id === activeCategory)!;

  usePageTitle(activeCat.label + ' / Settings');

  const { active } = useAuth();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const visibleCategories = useMemo(() => {
    return CATEGORIES.filter((c) => {
      if (c.authRequired && !active) return false;
      return true;
    });
  }, [active]);

  function renderDetail() {
    if (isUnknownCategory) return <Flowback />;

    switch (activeCategory) {
      case 'appearance': return <AppearanceSettings />;
      case 'home': return <HomeSettings />;
      case 'nav': return <NavSettings />;
      case 'port': return <PortSettings />;
      case 'data': return <DataSettings />;
      case 'download': return <DownloadSettings />;
      case 'lock': return <LockSettings />;
      case 'sw': return <SwSettings />;
      default: return null;
    }
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <div className={`mpi-settings-layout ${settings_classes.layout}`}>

        <div className={`mpi-settings-nav${mobileShowDetail ? ' mpi-settings-nav--hidden' : ''} ${mobileShowDetail ? settings_classes.nav_hidden : settings_classes.nav}`}>
          <div className={`mpi-settings-nav-header ${settings_classes.nav_header}`}>
            <h1 className={settings_classes.nav_heading}>Settings</h1>
          </div>

          <div className={`mpi-settings-nav-list ${settings_classes.nav_list}`}>
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
                  className={`mpi-settings-nav-item ${settings_classes.nav_item}`}
                  title={cat.desc}
                >
                  <span className={`mpi-settings-nav-item-label ${settings_classes.nav_item_label}`}>{cat.label}</span>
                  <span className={`mpi-settings-nav-item-chevron ${settings_classes.nav_item_chevron}`}><ExternalIcon size={14} /></span>
                </a>
              ) : (
                <Link
                  key={cat.id}
                  to={cat.to ?? `/settings/${cat.id}`}
                  state={cat.id === 'sessions' ? { from: 'settings' } : undefined}
                  className={`mpi-settings-nav-item${!cat.to && activeCategory === cat.id ? ' active' : ''} ${!cat.to && activeCategory === cat.id ? settings_classes.nav_item_active : settings_classes.nav_item}`}
                  title={cat.desc}
                  onClick={() => setMobileShowDetail(true)}
                >
                  <span className={`mpi-settings-nav-item-label ${settings_classes.nav_item_label}`}>{cat.label}</span>
                  <span className={`mpi-settings-nav-item-chevron ${settings_classes.nav_item_chevron}`}><ChevronRight size={16} /></span>
                </Link>
              )
            )}
          </div>

          <div className={`mpi-settings-nav-footer ${settings_classes.nav_footer}`}>
            <AppFooter version={RELEASES[0].version} className={settings_classes.nav_footer_text} />
          </div>
        </div>

        <div className={`mpi-settings-detail${mobileShowDetail ? ' mpi-settings-detail--visible' : ''} ${mobileShowDetail ? settings_classes.detail_visible : settings_classes.detail}`}>
          <div className={`mpi-settings-detail-header ${settings_classes.detail_header}`}>
            <button
              className={`mpi-settings-detail-back ${settings_classes.detail_back}`}
              onClick={() => setMobileShowDetail(false)}
              aria-label="Back to settings list"
            >
              <ArrowLeftIcon size={18} />
            </button>
            <span>{isUnknownCategory ? 'What' : activeCat.label}</span>
          </div>

          <div className={`mpi-settings-detail-scroll ${settings_classes.detail_scroll}`}>
            <div className={`mpi-settings-detail-content ${settings_classes.detail_content}`}>
              {renderDetail()}
            </div>
          </div>
        </div>
      </div>
    </Suspense>
  );
}
