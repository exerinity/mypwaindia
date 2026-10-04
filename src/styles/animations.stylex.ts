import * as stylex from '@stylexjs/stylex';

const shimmer = stylex.keyframes({
  from: { backgroundPosition: '200% 0' },
  to: { backgroundPosition: '-200% 0' },
});

const slide_in = stylex.keyframes({
  from: { opacity: 0, transform: 'translateX(40px)' },
  to: { opacity: 1, transform: 'translateX(0)' },
});

const slide_out = stylex.keyframes({
  from: { opacity: 1, transform: 'translateX(0)' },
  to: { opacity: 0, transform: 'translateX(-40px)' },
});

const styles = stylex.create({
  skeleton: {
    display: 'block', borderRadius: '4px',
    backgroundImage: 'linear-gradient(90deg, color-mix(in srgb, var(--fg) 8%, transparent) 25%, color-mix(in srgb, var(--fg) 18%, transparent) 50%, color-mix(in srgb, var(--fg) 8%, transparent) 75%)',
    backgroundSize: '200% 100%', animationName: shimmer,
    animationDuration: '1.5s', animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  release_summary: {
    width: '100%', backgroundColor: 'transparent !important',
    borderWidth: 0, borderStyle: 'none', cursor: 'pointer', padding: '10px 0',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    color: 'inherit !important', font: 'inherit', textAlign: 'left',
    boxShadow: 'none !important',
  },
  release_entry_summary: { flexWrap: 'wrap', gap: '8px' },
  release_version: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' },
  release_importance: {
    padding: '2px 7px', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: '999px',
    backgroundColor: 'var(--pill-bg)', color: 'var(--muted)',
    fontSize: '0.75rem', lineHeight: 1.4, whiteSpace: 'nowrap',
  },
  release_major: { borderColor: 'var(--brand)', backgroundColor: 'var(--brand)', color: 'var(--brand-text)' },
  release_massive: { borderColor: 'var(--alert-error)', backgroundColor: 'var(--alert-error)', color: '#fff' },
  release_body: { display: 'grid', gridTemplateRows: '0fr', transition: 'grid-template-rows 180ms ease' },
  release_body_open: { gridTemplateRows: '1fr' },
  release_body_inner: {
    overflow: 'hidden', opacity: 0, transform: 'translateY(-4px)',
    transition: 'opacity 150ms ease 30ms, transform 150ms ease 30ms',
  },
  release_body_inner_open: { opacity: 1, transform: 'translateY(0)' },
  page_slide_in: { animationName: slide_in, animationDuration: '0.12s', animationTimingFunction: 'ease-out' },
  page_slide_out: { animationName: slide_out, animationDuration: '0.1s', animationTimingFunction: 'ease-in', animationFillMode: 'forwards' },
});

export const animation_classes = {
  skeleton: stylex.props(styles.skeleton).className,
  release_summary: stylex.props(styles.release_summary).className,
  release_entry_summary: stylex.props(styles.release_summary, styles.release_entry_summary).className,
  release_version: stylex.props(styles.release_version).className,
  release_importance: stylex.props(styles.release_importance).className,
  release_major: stylex.props(styles.release_importance, styles.release_major).className,
  release_massive: stylex.props(styles.release_importance, styles.release_massive).className,
  release_body: stylex.props(styles.release_body).className,
  release_body_open: stylex.props(styles.release_body, styles.release_body_open).className,
  release_body_inner: stylex.props(styles.release_body_inner).className,
  release_body_inner_open: stylex.props(styles.release_body_inner, styles.release_body_inner_open).className,
  page_slide_in: stylex.props(styles.page_slide_in).className,
  page_slide_out: stylex.props(styles.page_slide_out).className,
};
