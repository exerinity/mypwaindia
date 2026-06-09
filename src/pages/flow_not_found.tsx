import { useState } from 'react';
import { Modal } from '../components/modal.tsx';

function goHome() { window.location.replace('/'); }

export default function FlowNotFoundPage() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <Modal open={open} fullscreen title="">{null}</Modal>
      <Modal
        open={open}
        title="Error"
        onClose={() => { setOpen(false); goHome(); }}
      >
        <p className="mt-0 mb-0">Oops, something went wrong. Please try again later.</p>
        <div className="modal-actions">
          <button onClick={goHome}>OK</button>
        </div>
      </Modal>
    </>
  );
}

// i am trying so hard to larp as the twitter web app