import * as stylex from '@stylexjs/stylex';

const modal_pop = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(6px) scale(0.98)' }, to: { opacity: 1, transform: 'translateY(0) scale(1)' } });
const modal_fade = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } });
const modal_pop_out = stylex.keyframes({ from: { opacity: 1, transform: 'translateY(0) scale(1)' }, to: { opacity: 0, transform: 'translateY(6px) scale(0.98)' } });
const modal_noop = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 1 } });
const modal_fade_out = stylex.keyframes({ from: { opacity: 1, transform: 'translateY(0)' }, to: { opacity: 0, transform: 'translateY(6px)' } });
const backdrop_in = stylex.keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });
const backdrop_out = stylex.keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });
const slide_in_right = stylex.keyframes({ from: { opacity: 0, transform: 'translateX(40px)' }, to: { opacity: 1, transform: 'translateX(0)' } });
const slide_out_left = stylex.keyframes({ from: { opacity: 1, transform: 'translateX(0)' }, to: { opacity: 0, transform: 'translateX(-40px)' } });

const styles = stylex.create({
  root: {
    position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
    marginRight: 'var(--mpi-tp-inset)', transition: 'margin-right var(--mpi-tp-ease)',
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 'max(24px, env(safe-area-inset-top))',
    paddingRight: 'max(24px, env(safe-area-inset-right))',
    paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
    paddingLeft: 'max(24px, env(safe-area-inset-left))',
  },
  root_fullscreen: {
    backgroundColor: 'transparent',
    '::before': {
      content: '""', position: 'absolute', inset: 0,
      backgroundColor: 'var(--bg)', animationName: backdrop_in,
      animationDuration: '0.2s', animationTimingFunction: 'ease-out',
      animationFillMode: 'forwards',
    },
  },
  root_fullscreen_closing: {
    '::before': {
      animationName: backdrop_out,
      animationTimingFunction: 'ease-in',
    },
  },
  root_noanim: {
    '::before': { animationName: modal_noop, animationDuration: '1ms', animationTimingFunction: 'linear' },
  },
  backdrop: {
    position: 'absolute', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(2px)', animationName: backdrop_in,
    animationDuration: '0.15s', animationTimingFunction: 'ease-out', animationFillMode: 'forwards',
  },
  backdrop_closing: {
    animationName: backdrop_out, animationDuration: '0.1s',
    animationTimingFunction: 'ease-in',
  },
  backdrop_noanim: { animationName: modal_noop, animationDuration: '1ms', animationTimingFunction: 'linear' },
  panel: {
    position: 'relative', backgroundColor: 'var(--card)',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
    width: '100%', maxWidth: '480px', maxHeight: 'calc(100dvh - 48px)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
    animationName: modal_pop, animationDuration: '0.12s', animationTimingFunction: 'ease-out',
  },
  panel_closing: {
    animationName: modal_pop_out, animationDuration: '0.1s',
    animationTimingFunction: 'ease-in', animationFillMode: 'forwards',
  },
  panel_fullscreen: { animationName: modal_fade },
  panel_fullscreen_closing: {
    animationName: modal_fade_out, animationDuration: '0.1s',
    animationTimingFunction: 'ease-in', animationFillMode: 'forwards',
  },
  panel_slide: { animationName: slide_in_right },
  panel_slide_closing: {
    animationName: slide_out_left, animationDuration: '0.1s',
    animationTimingFunction: 'ease-in', animationFillMode: 'forwards',
  },
  panel_noanim: {
    animationName: modal_noop, animationDuration: '1ms',
    animationTimingFunction: 'linear', animationFillMode: 'forwards',
  },
  header: {
    display: 'grid', gridTemplateColumns: 'auto 1fr auto', alignItems: 'center',
    gap: '12px', padding: '12px 14px', borderBottomWidth: '1px',
    borderBottomStyle: 'solid', borderBottomColor: 'var(--border)',
  },
  close: {
    backgroundColor: { default: 'transparent', ':hover': 'var(--bg-elev)' },
    borderWidth: 0, borderStyle: 'none', color: 'var(--fg)',
    width: '36px', height: '36px', padding: 0, borderRadius: '8px',
    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  title: { margin: 0, fontSize: '1rem', fontWeight: 600, textAlign: 'center' },
  title_logo: { justifySelf: 'center' },
  header_spacer: { width: '36px' },
  body: { padding: '20px', overflowY: 'auto', flexGrow: 1, flexShrink: 1, flexBasis: '0%' },
  actions: { display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' },
});

export const modal_classes = {
  root: stylex.props(styles.root).className,
  root_fullscreen: stylex.props(styles.root, styles.root_fullscreen).className,
  root_fullscreen_closing: stylex.props(styles.root, styles.root_fullscreen, styles.root_fullscreen_closing).className,
  root_noanim: stylex.props(styles.root).className,
  root_fullscreen_noanim: stylex.props(styles.root, styles.root_fullscreen, styles.root_noanim).className,
  backdrop: stylex.props(styles.backdrop).className,
  backdrop_closing: stylex.props(styles.backdrop, styles.backdrop_closing).className,
  backdrop_noanim: stylex.props(styles.backdrop, styles.backdrop_noanim).className,
  panel: stylex.props(styles.panel).className,
  panel_closing: stylex.props(styles.panel, styles.panel_closing).className,
  panel_fullscreen: stylex.props(styles.panel, styles.panel_fullscreen).className,
  panel_fullscreen_closing: stylex.props(styles.panel, styles.panel_fullscreen_closing).className,
  panel_slide: stylex.props(styles.panel, styles.panel_slide).className,
  panel_slide_closing: stylex.props(styles.panel, styles.panel_slide_closing).className,
  panel_noanim: stylex.props(styles.panel, styles.panel_noanim).className,
  header: stylex.props(styles.header).className,
  close: stylex.props(styles.close).className,
  title: stylex.props(styles.title).className,
  title_logo: stylex.props(styles.title_logo).className,
  header_spacer: stylex.props(styles.header_spacer).className,
  body: stylex.props(styles.body).className,
  actions: stylex.props(styles.actions).className,
};
