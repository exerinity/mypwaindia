import { useState, useEffect } from 'react';
import { Modal } from './modal.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { ExternalIcon } from './icons.tsx';
import { hideGet, hideSet } from '../utils/storage.ts';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPill() {
  const { settings } = useSettings();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [hidden, setHidden] = useState(() => hideGet('install'));

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (settings.scambait || hidden) return null;

  function hide() {
    hideSet('install');
    setHidden(true);
    setShowModal(false);
  }

  async function handleClick() {
    if (prompt) {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') setPrompt(null);
    } else {
      setShowModal(true);
    }
  }

  return (
    <>
      <button className="pill clickable" onClick={handleClick}>
        <span className="pill-label">Install app</span>
      </button>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Install the MyPayIndia PWA">
        <p>The MyPayIndia PWA works best when installed as an app. Of course, you don't need to, but here are some general instructions on how depending on your browser/device:</p>
        <small className="muted">(or, create a shortcut)</small>

        <details style={{ marginTop: '1rem' }}>
          <summary><strong>Chrome Desktop</strong> (and most derivatives)</summary>
          <ol>
            <li>Click the 3-dot menu in the top-right</li>
            <li>Navigate to <strong>Cast, save and share</strong></li>
            <li>Click <strong>Install page as app</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Chrome Android</strong></summary>
          <ol>
            <li>Click the 3-dot menu in the top right</li>
            <li>Click on <strong>Add to home screen</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Vivaldi Desktop</strong></summary>
          <ol>
            <li>Right-click on the tab</li>
            <li>Navigate to <strong>Progressive Web Apps</strong></li>
            <li>Click <strong>Install page as app</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Safari iOS</strong></summary>
          <ol>
            <li>Tap the share icon</li>
            <li>Tap <strong>Add to Home Screen</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Safari Mac</strong></summary>
          <ol>
            <li>In the menu bar, navigate to <strong>File</strong> and click <strong>Add to Dock…</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Firefox Desktop</strong></summary>
          <ol>
            <li>If you see it, click <strong>Add to Taskbar</strong> in the omnibox</li>
          </ol>
        </details>

        <details>
          <summary><strong>Firefox Android</strong></summary>
          <ol>
            <li>Click the 3-dot menu in the address bar</li>
            <li>Click on <strong>Add to home screen</strong></li>
          </ol>
        </details>

        <details>
          <summary><strong>Anything else</strong></summary>
          <p>
            If your browser isn't listed here, look for options related to "Add to home screen",
            "Install as app", "Add shortcut", or similar. At the bare minimum, you could bookmark the app.
          </p>
        </details>
        <p>
          There are also mobile apps for iOS and Android available for download: <a href="https://mypayindia.com/app/" target="_blank" rel="noopener noreferrer">mypayindia.com/app <ExternalIcon /></a>
        </p>
        <p>
          <button className="secondary compact" onClick={hide}>Hide this button permanently</button>
        </p>
      </Modal>
    </>
  );
}
