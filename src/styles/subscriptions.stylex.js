import * as stylex from '@stylexjs/stylex';

export const subscription_styles = stylex.create({
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  info: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0%',
    minWidth: 200,
    display: 'grid',
    gap: 2,
  },
  trialing: {
    backgroundColor: 'rgba(47, 143, 252, 0.15)',
    color: 'var(--alert-info)',
  },
  past_due: {
    backgroundColor: 'rgba(230, 160, 50, 0.18)',
    color: 'var(--alert-warning)',
  },
});
