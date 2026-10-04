import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  list: {
    maxWidth: { default: '560px', '@media (max-width: 900px)': 'none' },
    backgroundColor: 'var(--card)', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: 'var(--radius)', overflow: 'clip',
  },
  list_embedded: { maxWidth: 'none' },
  day: {
    position: 'sticky', top: 'var(--mpi-header-h, 92px)', zIndex: 1,
    padding: '6px 14px', backgroundColor: 'var(--bg-elev)',
    borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)',
    color: 'var(--muted)', fontSize: '0.76rem', fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  row: {
    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px',
    borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: 'var(--border)',
    color: 'var(--fg)', textDecoration: 'none', touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    backgroundColor: { default: 'transparent', ':hover': 'var(--bg-elev)', ':active': 'var(--table-row-alt)' },
  },
  row_last: { borderBottomWidth: 0, borderBottomStyle: 'none' },
  main: { display: 'flex', flexDirection: 'column', gap: '2px', flexGrow: 1, flexShrink: 1, flexBasis: '0%', minWidth: 0 },
  name: { fontWeight: 600, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  amount: { fontSize: '0.95rem', fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  amount_out: { color: 'var(--alert-error)' },
  amount_in: { color: 'var(--success)' },
  meta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', flexShrink: 0, textAlign: 'right' },
  time: { fontWeight: 600, fontSize: '0.9rem', fontVariantNumeric: 'tabular-nums' },
  status: { fontSize: '0.8rem', color: 'var(--muted)' },
  status_cancelled: { color: 'var(--alert-error)' },
  chevron: { display: 'flex', flexShrink: 0, color: 'var(--muted)' },
});

export const simple_history_classes = {
  list: stylex.props(styles.list).className,
  list_embedded: stylex.props(styles.list, styles.list_embedded).className,
  day: stylex.props(styles.day).className,
  row: stylex.props(styles.row).className,
  row_last: stylex.props(styles.row, styles.row_last).className,
  main: stylex.props(styles.main).className,
  name: stylex.props(styles.name).className,
  amount_out: stylex.props(styles.amount, styles.amount_out).className,
  amount_in: stylex.props(styles.amount, styles.amount_in).className,
  meta: stylex.props(styles.meta).className,
  time: stylex.props(styles.time).className,
  status: stylex.props(styles.status).className,
  status_cancelled: stylex.props(styles.status, styles.status_cancelled).className,
  chevron: stylex.props(styles.chevron).className,
};
