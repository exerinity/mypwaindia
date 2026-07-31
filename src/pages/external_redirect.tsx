import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../components/modal.tsx';
import { ErrorIcon, ExternalIcon } from '../components/icons.tsx';

export default function ExternalRedirectPage({ to }: { to: string }) {
  const nav = useNavigate();
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    if (stopped) return;
    if (secondsLeft <= 0) {
      window.location.replace(to);
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, stopped, to]);

  return (
    <Modal
      open
      className="noanim"
      fullscreen
      title="Unsupported link"
      onClose={() => nav('/dash')}
      bgIcon={<div className="app-lock-bg-icon"><ErrorIcon size={666} /></div>}
    >
      {stopped ? (
        <p className="mt-0">Redirect stopped - if you still want to go there, click Go</p>
      ) : (
        <p className="mt-0">This link is unsupported in MyPWAIndia. Redirecting you back to MyPayIndia.com in {secondsLeft} second{secondsLeft === 1 ? '' : 's'}...</p>
      )}
      <div className="modal-actions">
        <button type="button" onClick={() => nav('/dash')}>Go to dashboard</button>
        {stopped ? (
          <a className="btn secondary" href={to}>Go <ExternalIcon /></a>
        ) : (
          <button type="button" className="secondary" onClick={() => setStopped(true)}>Stop</button>
        )}
      </div>
    </Modal>
  );
}
