import { useNavigate, useLocation } from 'react-router-dom';
import { Modal } from '../components/ui/modal.tsx';

interface FlowNotFoundProps {
  embedded?: boolean;
  onClose?: () => void;
}

export default function FlowNotFound({ embedded = false, onClose }: FlowNotFoundProps) {
  const nav = useNavigate();
  const location = useLocation();

  const od = !location.state || !('backgroundLocation' in (location.state as any));

  const content = (
    <p className="mt-0 mb-0">Oops, something went wrong. Please try again later.</p>
  );

  if (embedded) {
    return (
      <>
        {content}
        <div className="modal-actions">
          <button onClick={onClose ?? (() => { nav('/dash'); })}>OK</button>
        </div>
      </>
    );
  }

  if (od) {
    return (
      <>
        <Modal open fullscreen title="">{null}</Modal>
        <Modal
          open
          title="Error"
          onClose={() => { nav('/'); }}
        >
          <p className="mt-0 mb-0">Oops, something went wrong. Please try again later.</p>
          <div className="modal-actions">
            <button onClick={() => { nav('/dash'); }}>OK</button>
          </div>
        </Modal>
      </>
    );
  }

  return content;
}

// the twitter web app larp never ends