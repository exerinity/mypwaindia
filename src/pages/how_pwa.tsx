import { useState, lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { useInstallPrompt, isInstalled } from '../hooks/install_prompt.ts';
import { useToast } from '../context/toast_ctx.tsx';
import { ExternalIcon } from '../components/icons.tsx';
import { hideGet, hideSet } from '../utils/storage.ts';

const Modal = lazy(() => import('../components/modal.tsx').then((m) => ({ default: m.Modal })));

interface Guide { browser: string; note?: string; steps?: ReactNode[]; text?: ReactNode }

const GUIDES: Guide[] = [
  {
    browser: 'Chrome Desktop',
    note: 'and most derivatives',
    steps: [
      'Click the 3-dot menu in the top-right',
      <>Navigate to <strong>Cast, save and share</strong></>,
      <>Click <strong>Install page as app</strong></>,
    ],
  },
  {
    browser: 'Chrome Android',
    steps: [
      'Click the 3-dot menu in the top right',
      <>Click on <strong>Add to home screen</strong></>,
    ],
  },
  {
    browser: 'Vivaldi Desktop',
    steps: [
      'Right-click on the tab',
      <>Navigate to <strong>Progressive Web Apps</strong></>,
      <>Click <strong>Install page as app</strong></>,
    ],
  },
  {
    browser: 'Safari iOS',
    steps: [
      'Tap the share icon',
      <>Tap <strong>Add to Home Screen</strong></>,
    ],
  },
  {
    browser: 'Safari Mac',
    steps: [
      <>In the menu bar, navigate to <strong>File</strong> and click <strong>Add to Dock…</strong></>,
    ],
  },
  {
    browser: 'Firefox Desktop',
    steps: [
      <>If you see it, click <strong>Add to Taskbar</strong> in the omnibox</>,
    ],
  },
  {
    browser: 'Firefox Android',
    steps: [
      'Click the 3-dot menu in the address bar',
      <>Click on <strong>Add to home screen</strong></>,
    ],
  },
  {
    browser: 'Anything else',
    text: <>
      If your browser isn't listed here, look for options related to "Add to home screen",
      "Install as app", "Add shortcut", or similar. At the bare minimum, you could bookmark the app.
    </>,
  },
];

function GuideItem({ guide, borderBottom, open, onToggle }: { guide: Guide; borderBottom: boolean; open: boolean; onToggle: () => void }) {
  return (
    <div style={{ borderBottom: borderBottom ? '1px solid var(--border)' : 'none', padding: '4px 0' }}>
      <button
        className="release-summary"
        onClick={onToggle}
        aria-expanded={open}
      >
        <strong>{guide.browser}</strong>
        {guide.note && <span className="muted" style={{ fontSize: '0.85rem' }}>{guide.note}</span>}
      </button>
      <div className={`release-body${open ? ' open' : ''}`}>
        <div className="release-body-inner">
          {guide.steps && (
            <ol style={{ marginTop: 6, marginBottom: 4 }}>
              {guide.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          )}
          {guide.text && <p style={{ marginTop: 6, marginBottom: 4 }}>{guide.text}</p>}
        </div>
      </div>
    </div>
  );
}

export default function HowPwaPage() {
  usePageTitle('Install the app');
  const toast = useToast();
  const { available, trigger } = useInstallPrompt();
  const [hidden, setHidden] = useState(() => hideGet('install'));
  const [installed] = useState(isInstalled);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [hideNotice, setHideNotice] = useState(false);
  const navigate = useNavigate();

  async function handleTry() {
    const outcome = await trigger();
    if (outcome === 'accepted') toast.success('Installing the app');
    else if (outcome === 'dismissed') toast.info('The install prompt was dismissed (your browser may only offer it again later)');
    else toast.info("Your browser didn't offer an install prompt (follow the steps below instead)");
  }

  function toggleGuide(browser: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(browser)) next.delete(browser); else next.add(browser);
      return next;
    });
  }

  function hide() {
    hideSet('install');
    setHidden(true);
    setHideNotice(true);
  }

  return (
    <>
      <h1 className="mt-0">Install the MyPayIndia PWA</h1>

      {installed && <p className="alert alert-success mt-0">You're already using the app as an installed PWA.</p>}

      <p className="mt-0 mb-0">The MyPayIndia PWA works best when installed as an app. Of course, you don't need to, but here are some general instructions on how depending on your browser/device:</p>

      <p className="mt-0 mb-0">
        <button type="button" onClick={handleTry}>Trigger install prompt</button>
        {!available && <span className="muted" style={{ marginLeft: 8, fontSize: '0.875rem' }}>probably won't work</span>}
      </p>

      <div className="card">
        <p className="mt-0 mb-0">{GUIDES.length} instruction entries</p>
        {GUIDES.map((guide, i) => (
          <GuideItem
            key={guide.browser}
            guide={guide}
            borderBottom={i < GUIDES.length - 1}
            open={expanded.has(guide.browser)}
            onToggle={() => toggleGuide(guide.browser)}
          />
        ))}
      </div>
      <h3>Already installed / don't care?</h3>
      <p className="mt-0 mb-0">
        <button className="secondary" onClick={hide} disabled={hidden}>
          Hide the install pill
        </button>
      </p>

      <Suspense fallback={null}>
        <Modal open={hideNotice} onClose={() => navigate('/')} title="Hidden">
          <p className="mt-0 mb-0">The install pill is now hidden - to unhide it, go to <Link to="/settings/data">Settings &gt; Data control &gt; Hide stuff</Link></p>
          <p>To return to this page, go to <a href="https://mypayindia.sbs/i/how_pwa" target="_blank" rel="noopener noreferrer">mypayindia.sbs/i/how_pwa</a></p>
          <p className="mt-0 mb-0">
            <button onClick={() => navigate('/')}>Go home</button>
          </p>
        </Modal>
      </Suspense>
    </>
  );
}
