import * as stylex from '@stylexjs/stylex';

const bg_in = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 0.04 } });
const bg_out = stylex.keyframes({ from: { opacity: 0.04 }, to: { opacity: 0 } });

const styles = stylex.create({
  screen: {
    position: 'fixed', inset: 0, zIndex: 9000, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 'max(24px, env(safe-area-inset-top))', paddingRight: '24px',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))', paddingLeft: '24px',
    backgroundColor: 'var(--bg)', overflow: 'hidden',
    userSelect: 'none', WebkitUserSelect: 'none',
  },
  bg_icon: {
    position: 'absolute', bottom: '-140px', right: '-140px',
    color: 'var(--fg)', opacity: 0.04, transform: 'rotate(-18deg)',
    pointerEvents: 'none', zIndex: 0,
    animationName: bg_in, animationDuration: '0.3s', animationTimingFunction: 'ease-out',
  },
  bg_icon_closing: {
    animationName: bg_out, animationDuration: '0.2s',
    animationTimingFunction: 'ease-in', animationFillMode: 'forwards',
  },
  card: { position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px', textAlign: 'center' },
  pin_dots: { display: 'flex', justifyContent: 'center', gap: '12px', margin: '18px 0 22px' },
  pin_dot: {
    width: '14px', height: '14px', borderRadius: '50%',
    borderWidth: '1.5px', borderStyle: 'solid', borderColor: 'var(--border)',
    backgroundColor: 'transparent', transition: 'background 0.15s, border-color 0.15s',
  },
  pin_dot_filled: { backgroundColor: 'var(--brand)', borderColor: 'var(--brand)' },
  keypad: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', maxWidth: '260px', margin: '0 auto' },
  key: {
    fontSize: '1.3rem', padding: '14px 0', borderRadius: '999px',
    backgroundColor: { default: 'var(--card)', ':active': 'var(--card-soft)' },
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    color: 'var(--fg)', cursor: 'pointer',
  },
  key_clear: { fontSize: '0.85rem', color: 'var(--muted)' },
  pattern_grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px', maxWidth: '220px', margin: '18px auto 0' },
  pattern_dot: {
    width: '100%', aspectRatio: '1', borderRadius: '50%',
    borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--border)',
    backgroundColor: 'var(--card)', cursor: 'pointer',
    transition: 'background 0.15s, border-color 0.15s, transform 0.1s',
  },
  pattern_dot_active: {
    backgroundColor: 'var(--brand)', borderColor: 'var(--brand)', transform: 'scale(1.1)',
  },
});

export const app_lock_classes = {
  screen: stylex.props(styles.screen).className,
  bg_icon: stylex.props(styles.bg_icon).className,
  bg_icon_closing: stylex.props(styles.bg_icon, styles.bg_icon_closing).className,
  card: stylex.props(styles.card).className,
  pin_dots: stylex.props(styles.pin_dots).className,
  pin_dot: stylex.props(styles.pin_dot).className,
  pin_dot_filled: stylex.props(styles.pin_dot, styles.pin_dot_filled).className,
  keypad: stylex.props(styles.keypad).className,
  key: stylex.props(styles.key).className,
  key_clear: stylex.props(styles.key, styles.key_clear).className,
  pattern_grid: stylex.props(styles.pattern_grid).className,
  pattern_dot: stylex.props(styles.pattern_dot).className,
  pattern_dot_active: stylex.props(styles.pattern_dot, styles.pattern_dot_active).className,
};
