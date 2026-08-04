import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/modal.tsx';
import { ErrorIcon, ExternalIcon } from '../../components/ui/icons.tsx';

export default function ExternalRedirectPage({ to, schnell }: { to: string; schnell?: boolean }) {
  const nav = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (schnell) {
      window.location.replace(to);
      return;
    }
    if (stopped) return;
    if (secondsLeft <= 0) {
      window.location.replace(to);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, stopped, to, schnell]);

  if (schnell) return null;

  return (
    <Modal
      open
      className="noanim"
      fullscreen
      title={stopped ? '' : 'That is not here'}
      onClose={() => nav('/dash')}
      bgIcon={<div className="app-lock-bg-icon"><ErrorIcon size={666} /></div>}
    >
      {stopped ? (
        <p className="mt-0">Redirect stopped - if you still want to go there, click Go</p>
      ) : (
        <p className="mt-0">This resource is unsupported in MyPWAIndia. Taking you back to the MyPayIndia.com page in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}...</p>
      )}
      <div className="modal-actions">
        <button type="button" onClick={() => nav('/dash')}>Go to dashboard</button>
        {stopped ? (
          <a className="btn secondary" href={to}>Go <ExternalIcon /></a>
        ) : (
          <button type="button" className="secondary" onClick={() => setStopped(true)}>No wait</button>
        )}
      </div>
    </Modal>
  );
}
