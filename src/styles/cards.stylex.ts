import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  card: {
    backgroundColor: 'var(--card)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: 'var(--radius)',
    padding: '22px', minWidth: 0,
  },
  compact: { padding: '12px 14px' },
  restricted: {
    pointerEvents: 'none', userSelect: 'none', position: 'relative',
    '::before': {
      content: '""', position: 'absolute', inset: 0,
      backdropFilter: 'blur(2px) grayscale(1)', backgroundColor: 'rgba(0, 0, 0, 0.3)',
      zIndex: 1, borderRadius: 'inherit',
    },
    '::after': {
      content: 'attr(data-reason)', backgroundColor: 'var(--alert-warning)',
      color: 'black', position: 'absolute', top: '10px', right: '15px', zIndex: 2,
      maxWidth: 'calc(100% - 45px)', padding: '4px 8px',
      borderRadius: 'var(--radius)', fontSize: '0.85rem',
    },
  },
  grid: { display: 'grid', gap: '20px' },
  grid_two: { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' },
  grid_three: { gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' },
  grid_team: { gridTemplateColumns: 'repeat(auto-fit, minmax(285px, 1fr))' },
});

export const card_classes = {
  card: stylex.props(styles.card).className,
  compact: stylex.props(styles.card, styles.compact).className,
  restricted: stylex.props(styles.card, styles.restricted).className,
  grid: stylex.props(styles.grid).className,
  grid_two: stylex.props(styles.grid, styles.grid_two).className,
  grid_three: stylex.props(styles.grid, styles.grid_three).className,
  grid_team: stylex.props(styles.grid, styles.grid_team).className,
};
