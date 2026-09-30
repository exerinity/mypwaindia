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
      onClose={() => nav('/dash')}
      bgIcon={<div className="app-lock-bg-icon"><ErrorIcon size={666} /></div>}
    >
      {stopped ? (
        <p className="mt-0">Have a nice day!</p>
      ) : (
        <p className="mt-0">You've requested a MyPayIndia resource that is not available from the web app. Taking you back to MyPayIndia.com in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}...</p>
      )}
      <div className="modal-actions">
        <a className="btn" href={to}>Go to resource <ExternalIcon /></a>
        {stopped ? (
          <button type="button" className="secondary" onClick={() => nav('/dash')}>Go to dashboard</button>
        ) : (
          <button type="button" className="secondary" onClick={() => setStopped(true)}>Stop countdown</button>
        )}
      </div>
    </Modal>
  );
}
