import * as stylex from '@stylexjs/stylex';

const slide_up = stylex.keyframes({
  from: { opacity: 0, transform: 'translateY(12px)' },
  to: { opacity: 1, transform: 'translateY(0)' },
});
const fade_out = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });

const styles = stylex.create({
  container: {
    position: 'fixed',
    bottom: { default: 'calc(16px + var(--mpi-bottom-nav-h) + env(safe-area-inset-bottom))', '@media (max-width: 480px)': 'calc(12px + var(--mpi-bottom-nav-h) + env(safe-area-inset-bottom))' },
    left: { default: '50%', '@media (max-width: 480px)': '12px' },
    right: { default: null, '@media (max-width: 480px)': '12px' },
    transform: { default: 'translateX(-50%)', '@media (max-width: 480px)': 'none' },
    zIndex: 9500, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '8px', maxWidth: 'calc(100vw - 32px)',
    marginLeft: 'calc(var(--mpi-tp-inset) / -2)',
    transition: { default: 'margin-left var(--mpi-tp-ease)', '@media (max-width: 480px)': 'bottom 280ms cubic-bezier(0.32, 0.72, 0, 1)', '@media (prefers-reduced-motion: reduce)': 'none' },
  },
  toast: {
    display: 'flex', alignItems: 'center', gap: '12px',
    minWidth: { default: '220px', '@media (max-width: 480px)': 0 },
    boxShadow: 'var(--shadow)', backgroundColor: 'var(--card)',
    animationName: slide_up, animationDuration: '0.25s', animationTimingFunction: 'ease-out',
  },
  toast_leaving: { animationName: fade_out, animationDuration: '0.2s', animationTimingFunction: 'ease-in', animationFillMode: 'forwards' },
  close: {
    backgroundColor: 'transparent', borderWidth: 0, borderStyle: 'none',
    color: { default: 'var(--muted)', ':hover': 'var(--fg)' },
    fontSize: '1.2rem', padding: '0 4px', cursor: 'pointer', marginLeft: 'auto',
  },
  action: {
    backgroundColor: { default: 'transparent', ':hover': 'rgba(255,255,255,0.08)' },
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'currentColor',
    color: 'inherit', fontSize: '0.8rem', padding: '3px 10px',
    borderRadius: 'var(--radius)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  },
});

export const toast_classes = {
  container: stylex.props(styles.container).className,
  toast: stylex.props(styles.toast).className,
  toast_leaving: stylex.props(styles.toast, styles.toast_leaving).className,
  close: stylex.props(styles.close).className,
  action: stylex.props(styles.action).className,
};
