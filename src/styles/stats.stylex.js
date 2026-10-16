import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    color: 'var(--muted)',
    fontSize: '0.8rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  value: {
    fontSize: {
      default: '1.7rem',
      '@media (max-width: 480px)': '1.4rem',
    },
    fontWeight: 700,
    color: 'var(--brand)',
    fontVariantNumeric: 'tabular-nums',
  },
  sub: {
    color: 'var(--muted)',
    fontSize: '0.85rem',
  },
  balance_display: {
    fontSize: {
      default: '2.4rem',
      '@media (max-width: 900px)': '2rem',
      '@media (max-width: 480px)': '1.7rem',
    },
    fontWeight: 700,
    color: 'var(--brand)',
    fontVariantNumeric: 'tabular-nums',
    marginTop: 4,
    marginRight: 0,
    marginBottom: 4,
    marginLeft: 0,
  },
});

export const stat_classes = {
  card: stylex.props(styles.card).className,
  label: stylex.props(styles.label).className,
  value: stylex.props(styles.value).className,
  sub: stylex.props(styles.sub).className,
  balance_display: stylex.props(styles.balance_display).className,
};
