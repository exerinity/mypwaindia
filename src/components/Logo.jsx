export function Logo({ height = 38, className = 'app-header-logo' }) {
  return (
    <img
      src="https://mypayindia.com/siteassets/images/branding/logo-full.png"
      alt="MyPayIndia"
      height={height}
      className={className}
      draggable={false}
    />
  );
}