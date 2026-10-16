import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  wrap: {
    overflowX: 'auto', borderRadius: 'var(--radius)',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
  },
  table: { width: '100%', borderCollapse: 'collapse', backgroundColor: 'var(--card)' },
  controls: {
    display: 'flex', flexWrap: 'wrap', gap: '20px',
    alignItems: 'center', marginBottom: '12px',
  },
  search_field: { position: 'relative', display: 'flex', alignItems: 'center' },
});

export const table_classes = {
  wrap: stylex.props(styles.wrap).className,
  table: stylex.props(styles.table).className,
  controls: stylex.props(styles.controls).className,
  search_field: stylex.props(styles.search_field).className,
};
