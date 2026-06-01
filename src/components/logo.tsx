const LOGO_W = 512;
const LOGO_H = 189;

export function Logo({ height = 38, className = 'mpi-header-logo' }: { height?: number; className?: string }) {
  const w = Math.round(height * LOGO_W / LOGO_H);
  return (
    <img
      src="/i/mygayindia-full.png"
      alt="MyPayIndia"
      width={w}
      height={height}
      className={className}
      draggable={false}
    />
  );
}