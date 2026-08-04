import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../../context/settings_ctx.tsx';
import { isInstalled } from '../../hooks/install_prompt.ts';
import { hideGet, HIDE_EVENT } from '../../utils/storage.ts';

export function InstallPill() {
  const { settings } = useSettings();
  const [hidden, setHidden] = useState(() => hideGet('install'));
  const [installed] = useState(isInstalled);

  useEffect(() => {
    const update = () => setHidden(hideGet('install'));
    window.addEventListener(HIDE_EVENT, update);
    return () => window.removeEventListener(HIDE_EVENT, update);
  }, []);

  if (settings.scambait || hidden || installed) return null;

  return (
    <Link to="/i/how_pwa" className="pill clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className="pill-label">Install app</span>
    </Link>
  );
}
