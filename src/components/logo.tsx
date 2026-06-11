import { useSettings } from '../context/settings_ctx';

const LOGO_W = 512;
const LOGO_H = 189;

export function Logo({ height = 38, className = 'mpi-header-logo' }: { height?: number; className?: string }) {
  const { settings } = useSettings();
  const w = Math.round(height * LOGO_W / LOGO_H);
  return (
    <img
      src={settings.scambait ? '/i/mypayindia-full.webp' : '/i/mygayindia-full.webp'}
      alt="MyPayIndia"
      width={w}
      height={height}
      className={className}
      draggable={false}
    />
  );
}