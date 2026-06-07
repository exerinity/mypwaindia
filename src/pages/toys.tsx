import { useState } from 'react';
import { usePageTitle } from '../hooks/page_title.js';
import { useToast } from '../context/toast_ctx.tsx';
import { Modal } from '../components/modal.tsx';
import { ConfirmModal } from '../components/confirm_modal.tsx';
import { HoldButton } from '../components/hold_btn.tsx';

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

  const [toastMessage, setToastMessage] = useState('Ding dong');
  const [toastKind, setToastKind] = useState<ToastKind>('info');
  const [toastTimeout, setToastTimeout] = useState(4000);
  const [toastAction, setToastAction] = useState(false);

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
      <h1 className="mt-0">Toys</h1>
      <p className="mt-0 mb-0">Poke around with various UI components here. Nothing here actually does anything, but you can test interactive components like modals, toasts and buttons. Have fun!</p> 

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
    </div>
  );
}
