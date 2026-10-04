import * as stylex from '@stylexjs/stylex';

const nav_in = stylex.keyframes({ from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } });
const nav_out = stylex.keyframes({ from: { transform: 'translateY(0)' }, to: { transform: 'translateY(100%)' } });

const styles = stylex.create({
  nav: {
    WebkitTouchCallout: { default: null, '@media (display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)': 'none' },
    marginRight: 'var(--mpi-tp-inset)',
    transition: 'margin-right var(--mpi-tp-ease)',
    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 60,
    display: 'flex', alignItems: 'stretch',
    height: 'calc(58px + env(safe-area-inset-bottom))',
    backgroundColor: 'color-mix(in srgb, var(--bg) 90%, transparent)',
    backdropFilter: 'blur(16px) saturate(1.4)',
    WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
    borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: 'var(--border)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    paddingRight: 'env(safe-area-inset-right)',
    userSelect: 'none', WebkitUserSelect: 'none',
    animationName: nav_in,
    animationDuration: { default: '280ms', '@media (prefers-reduced-motion: reduce)': '1ms' },
    animationTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
  },
  nav_leaving: { pointerEvents: 'none', animationName: nav_out, animationFillMode: 'forwards' },
  pill: {
    position: 'absolute', top: 0, left: 0, borderRadius: '999px',
    backgroundColor: 'color-mix(in srgb, var(--brand) 16%, transparent)',
    pointerEvents: 'none',
    transition: { default: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), width 280ms cubic-bezier(0.32, 0.72, 0, 1), height 280ms cubic-bezier(0.32, 0.72, 0, 1)', '@media (prefers-reduced-motion: reduce)': 'none' },
  },
  pill_instant: { transition: 'none' },
  item: {
    position: 'relative', flexGrow: 1, flexShrink: 1, flexBasis: '0%', minWidth: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: '3px', padding: '6px 2px',
    color: { default: 'var(--muted)', ':hover': 'var(--fg)' },
    fontSize: '0.66rem', lineHeight: 1.15, textDecoration: 'none',
    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
    transition: 'color 160ms ease',
  },
  item_active: { color: 'var(--brand)', fontWeight: 500 },
  item_preview: { cursor: 'default' },
  icon: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '46px', maxWidth: '100%', height: '26px', borderRadius: '999px',
    transition: { default: 'transform 140ms ease', '@media (prefers-reduced-motion: reduce)': 'none' },
  },
  icon_bare: { width: '54px', height: '34px' },
  icon_preview_active: { backgroundColor: 'color-mix(in srgb, var(--brand) 16%, transparent)' },
  label: { maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  preview: {
    display: 'flex', alignItems: 'stretch', height: '58px', maxWidth: '420px',
    backgroundColor: 'var(--bg-elev)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: 'var(--radius)',
    overflow: 'hidden', userSelect: 'none',
  },
  preview_empty: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '100%', color: 'var(--muted)', fontSize: '0.85rem',
  },
});

export const bottom_nav_classes = {
  nav: stylex.props(styles.nav).className,
  nav_leaving: stylex.props(styles.nav, styles.nav_leaving).className,
  pill: stylex.props(styles.pill).className,
  pill_instant: stylex.props(styles.pill, styles.pill_instant).className,
  item: stylex.props(styles.item).className,
  item_active: stylex.props(styles.item, styles.item_active).className,
  item_preview: stylex.props(styles.item, styles.item_preview).className,
  item_preview_active: stylex.props(styles.item, styles.item_active, styles.item_preview).className,
  icon: stylex.props(styles.icon).className,
  icon_bare: stylex.props(styles.icon, styles.icon_bare).className,
  icon_preview_active: stylex.props(styles.icon, styles.icon_preview_active).className,
  icon_preview_active_bare: stylex.props(styles.icon, styles.icon_bare, styles.icon_preview_active).className,
  label: stylex.props(styles.label).className,
  preview: stylex.props(styles.preview).className,
  preview_empty: stylex.props(styles.preview_empty).className,
};
