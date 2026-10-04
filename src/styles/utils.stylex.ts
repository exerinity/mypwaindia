import * as stylex from '@stylexjs/stylex';

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } });
const blink_fade = stylex.keyframes({ '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.2 } });

const styles = stylex.create({
  empty: { textAlign: 'center', padding: '32px', color: 'var(--muted)' },
  loading_row: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '32px 24px', color: 'var(--muted)' },
  loading_label: { animationName: blink_fade, animationDuration: '1.4s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' },
  spinner: {
    display: 'inline-block', flexShrink: 0, width: '18px', height: '18px',
    borderWidth: '2.5px', borderStyle: 'solid', borderColor: 'var(--border)',
    borderTopColor: 'var(--brand)', borderRightColor: 'var(--brand)', borderRadius: '50%',
    animationName: spin, animationDuration: '0.55s', animationTimingFunction: 'linear', animationIterationCount: 'infinite',
  },
  spinner_large: { width: '28px', height: '28px', borderWidth: '3px' },
  pre: { backgroundColor: 'rgba(0, 0, 0, 0.2)', padding: '12px', borderRadius: 'var(--radius)', overflowX: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'break-word' },
  mono: { fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '0.85em' },
  center: { textAlign: 'center' },
  spread: { justifyContent: 'space-between' },
  tight: { gap: '4px' },
  gap_sm: { gap: '8px' },
  gap_md: { gap: '16px' },
  mt_3: { marginTop: '24px' },
  row: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  muted: { color: 'var(--muted)' },
  mt_0: { marginTop: 0 },
  mt_1: { marginTop: '8px' },
  mt_2: { marginTop: '16px' },
  mb_2: { marginBottom: '16px' },
});

export const utility_classes = {
  empty: stylex.props(styles.empty).className,
  loading_row: stylex.props(styles.loading_row).className,
  loading_label: stylex.props(styles.loading_label).className,
  spinner: stylex.props(styles.spinner).className,
  spinner_large: stylex.props(styles.spinner, styles.spinner_large).className,
  pre: stylex.props(styles.pre).className,
  mono: stylex.props(styles.mono).className,
  center: stylex.props(styles.center).className,
  spread: stylex.props(styles.spread).className,
  tight: stylex.props(styles.tight).className,
  gap_sm: stylex.props(styles.gap_sm).className,
  gap_md: stylex.props(styles.gap_md).className,
  mt_3: stylex.props(styles.mt_3).className,
  row: stylex.props(styles.row).className,
  muted: stylex.props(styles.muted).className,
  mt_0: stylex.props(styles.mt_0).className,
  mt_1: stylex.props(styles.mt_1).className,
  mt_2: stylex.props(styles.mt_2).className,
  mb_2: stylex.props(styles.mb_2).className,
};
