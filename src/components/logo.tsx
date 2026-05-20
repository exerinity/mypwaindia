export function Logo({ height = 38, className = 'mpi-header-logo' }: { height?: number; className?: string }) {
  return (
    <img
      src="/i/logo-full.png"
      alt="MyPayIndia"
      height={height}
      className={className}
      draggable={false}
    />
  );
}