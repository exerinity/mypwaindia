import { ContentSkeleton } from '../../components/shell/app_skeleton.tsx';
import { useState, useEffect, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { useToast } from '../../context/toast_ctx.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { WarningIcon } from '../../components/ui/icons.tsx';
import { Skeleton } from '../../components/ui/status.tsx';

const ConfirmModal = lazy(() => import('../../components/ui/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
const HoldButton = lazy(() => import('../../components/ui/hold_btn.tsx').then((m) => ({ default: m.HoldButton })));
import { Link } from 'react-router-dom';
import { storageSet, KEYS } from '../../utils/storage.ts';

const TOAST_KINDS = ['info', 'success', 'error', 'warning'] as const;
type ToastKind = (typeof TOAST_KINDS)[number];

export default function MPTIPage() {
  usePageTitle('MyPWAToysIndia');
  const toast = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Good morning');
  const [modalContent, setModalContent] = useState('Coca-Cola or Pepsi?');
  const [modalFullscreen, setModalFullscreen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmHold, setConfirmHold] = useState(false);

  const [holdCount, setHoldCount] = useState(0);

  const [skelWidth, setSkelWidth] = useState(120);
  const [skelHeight, setSkelHeight] = useState(14);
  const [skelRadius, setSkelRadius] = useState(4);

  const [toastMessage, setToastMessage] = useState('Ding dong');
  const [toastKind, setToastKind] = useState<ToastKind>('info');
  const [toastTimeout, setToastTimeout] = useState(4000);
  const [toastAction, setToastAction] = useState(false);

  const [showRestrictionsBanner, setShowRestrictionsBanner] = useState(false);
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(false);
  const [showSessionExpiredBanner, setShowSessionExpiredBanner] = useState(false);
  const [showFetchFailedBanner, setShowFetchFailedBanner] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  const [bannerPortal, setBannerPortal] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setBannerPortal(document.getElementById('mpi-toy-banners'));
  }, []);

  const BANNER_TOGGLES: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }[] = [
    { id: 'dt-banner-restrictions', label: 'Account restrictions', checked: showRestrictionsBanner, onChange: setShowRestrictionsBanner },
    { id: 'dt-banner-onboarding', label: 'Onboarding reminder', checked: showOnboardingBanner, onChange: setShowOnboardingBanner },
    { id: 'dt-banner-session', label: 'Session expired', checked: showSessionExpiredBanner, onChange: setShowSessionExpiredBanner },
    { id: 'dt-banner-fetch', label: 'Data fetch failed', checked: showFetchFailedBanner, onChange: setShowFetchFailedBanner },
    { id: 'dt-banner-offline', label: 'Offline', checked: showOfflineBanner, onChange: setShowOfflineBanner },
  ];

  function simulateUpdater() {
    const newVersionId = toast.push('A new version is available, would you like to reload?', 'info', 0, {
      label: 'Go',
      onClick: () => {
        toast.remove(newVersionId);
        toast.info('Updating, one moment...');
        storageSet(KEYS.LAST_VERSION, '8');
        setTimeout(() => window.location.reload(), 600);
      },
    });
  }

  function fireToast() {
    toast.push(
      toastMessage,
      toastKind,
      toastTimeout,
      toastAction ? { label: 'Undo', onClick: () => toast.info('Undone') } : undefined,
    );
  }

  return (
    <div className="mpi-mpti">
      <Suspense fallback={<ContentSkeleton />}>
      <h1 className="mt-0">Toys</h1>
      <p className="mt-0 mb-0">Poke around with various UI components here. Nothing here actually does anything, but you can test interactive components like modals, toasts and buttons. Have fun!</p>

      {bannerPortal && createPortal(
        <>
          {showRestrictionsBanner && (
            <div className="verification-banner banner-error" style={{ display: 'flex', gap: 8 }}>
              <WarningIcon />Your account has some active restrictions: Account Frozen, Banned from Investment Opportunities™.
              {' '}<Link to="/account/restrictions" className="link">More...</Link>
            </div>
          )}
          {showOnboardingBanner && (
            <div className="verification-banner" style={{ display: 'flex', gap: 8 }}>
              <WarningIcon /> Please read and accept the onboarding message. Once you do, this message will be hidden. <Link to="/i/flow/onboarding" className="link">Open...</Link>
            </div>
          )}
          {showSessionExpiredBanner && (
            <div className="verification-banner" style={{ display: 'flex', gap: 8 }}>
              <WarningIcon /> Your session has expired. <Link to="/i/flow/sessions" className="link">Reinitialize the session...</Link>
            </div>
          )}
          {showFetchFailedBanner && (
            <div className="verification-banner" style={{ display: 'flex', gap: 8 }}>
              <WarningIcon /> Retrieving data failed: either the server did not respond or your session has expired. Data displayed may be out of date. <Link to="/i/flow/connection" className="link">Troubleshoot...</Link>
            </div>
          )}
          {showOfflineBanner && (
            <div className="verification-banner" style={{ display: 'flex', gap: 8 }}>
              <WarningIcon /> You are offline. To do most things, you need to be connected to the internet. <Link to="/i/flow/connection" className="link">Diagnose...</Link>
            </div>
          )}
        </>,
        bannerPortal
      )}

      <div className="card mb-2">
        <h2 className="mt-0">Compose a modal</h2>
        <label>Title</label>
        <input type="text" value={modalTitle} onChange={(e) => setModalTitle(e.target.value)} />
        <label>Content</label>
        <textarea rows={3} value={modalContent} onChange={(e) => setModalContent(e.target.value)} />
        <div className="checkbox-row">
          <input id="dt-modal-fullscreen" type="checkbox" checked={modalFullscreen} onChange={(e) => setModalFullscreen(e.target.checked)} />
          <label htmlFor="dt-modal-fullscreen" style={{ margin: 0 }}>Fullscreen (backdrop becomes opaque)</label>
        </div>
        <div className="btn-row">
          <button onClick={() => setModalOpen(true)}>Go</button>
        </div>
      </div>

      <div className="card mb-2">
        <h2 className="mt-0">Open a confirm modal</h2>
        <div className="checkbox-row">
          <input id="dt-confirm-hold" type="checkbox" checked={confirmHold} onChange={(e) => setConfirmHold(e.target.checked)} />
          <label htmlFor="dt-confirm-hold" style={{ margin: 0 }}>Hold button to confirm</label>
        </div>
        <div className="btn-row">
          <button onClick={() => setConfirmOpen(true)}>Go</button>
        </div>
      </div>

      <div className="card mb-2">
        <h2 className="mt-0">Hold button</h2>
        <p className="mt-0">Confirmed {holdCount} time{holdCount === 1 ? '' : 's'}</p>
        <div className="btn-row">
          <HoldButton onConfirm={() => setHoldCount((c) => c + 1)}>Go</HoldButton>
        </div>
      </div>

      <div className="card mb-2">
        <h2 className="mt-0">Skeleton</h2>
        <label>Width (px)</label>
        <input
          type="number"
          value={skelWidth}
          onChange={(e) => setSkelWidth(Number(e.target.value) || 0)}
          style={{ maxWidth: 120 }}
        />
        <label>Height (px)</label>
        <input
          type="number"
          value={skelHeight}
          onChange={(e) => setSkelHeight(Number(e.target.value) || 0)}
          style={{ maxWidth: 120 }}
        />
        <label>Radius (px)</label>
        <input
          type="number"
          value={skelRadius}
          onChange={(e) => setSkelRadius(Number(e.target.value) || 0)}
          style={{ maxWidth: 120 }}
        />
        <div className="btn-row">
          <Skeleton width={skelWidth} height={skelHeight} radius={skelRadius} style={{ display: 'inline-block' }} />
        </div>
      </div>

      <div className="card mb-2">
        <h2 className="mt-0">Simulate update</h2>
        <div className="btn-row">
          <button onClick={simulateUpdater}>Go</button>
        </div>
      </div>

      <div className="card mb-2">
        <h2 className="mt-0">Show banners</h2>
         <div style={{ display: 'flex', alignItems: 'center', gap: 8 }} className="mt-0 mb-0 alert alert-warning"><WarningIcon /><span>If you enable them all and have a small screen, you may just not see the app anymore</span></div>
        {BANNER_TOGGLES.map(({ id, label, checked, onChange }) => (
          <div className="checkbox-row" key={id}>
            <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
            <label htmlFor={id} style={{ margin: 0 }}>{label}</label>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mt-0">Compose a toast notification</h2>
        <label>Message</label>
        <input type="text" value={toastMessage} onChange={(e) => setToastMessage(e.target.value)} />
        <label>Kind</label>
        <select value={toastKind} onChange={(e) => setToastKind(e.target.value as ToastKind)}>
          {TOAST_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <label>Timeout (in ms, 0 for must be manually closed)</label>
        <input
          type="number"
          value={toastTimeout}
          onChange={(e) => setToastTimeout(Number(e.target.value) || 0)}
          style={{ maxWidth: 120 }}
        />
        <div className="checkbox-row">
          <input id="dt-toast-action" type="checkbox" checked={toastAction} onChange={(e) => setToastAction(e.target.checked)} />
          <label htmlFor="dt-toast-action" style={{ margin: 0 }}>Include action button</label>
        </div>
        <div className="btn-row">
          <button onClick={fireToast}>Go</button>
        </div>
      </div>

      <div className="card mt-2" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="spinner lg" />
        <span>Spinner that does nothing</span>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle || 'Untitled'}
        fullscreen={modalFullscreen}
      >
        <p style={{ whiteSpace: 'pre-wrap' }}>{modalContent}</p>
      </Modal>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => { toast.success('Thank you!'); setConfirmOpen(false); }}
        title="Confirm?"
        message="Yay or nay?"
        confirmLabel={confirmHold ? 'Confirm (hold)' : 'Confirm'}
        holdConfirm={confirmHold}
      />
      </Suspense>
    </div>
  );
}
