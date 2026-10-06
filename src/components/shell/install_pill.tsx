import { shell_classes } from '../../styles/shell.stylex.ts';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { isInstalled } from '../../hooks/install_prompt.ts';
import { hideGet, HIDE_EVENT } from '../../utils/storage.ts';

export function InstallPill() {
  const [hidden, setHidden] = useState(() => hideGet('install'));
  const [installed] = useState(isInstalled);

  useEffect(() => {
    const update = () => setHidden(hideGet('install'));
    window.addEventListener(HIDE_EVENT, update);
    return () => window.removeEventListener(HIDE_EVENT, update);
  }, []);

  if (hidden || installed) return null;

  return (
    <Link to="/i/how_pwa" className={`pill clickable ${shell_classes.pill_clickable}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className={`pill-label ${shell_classes.pill_label}`}>Install app</span>
    </Link>
  );
}
