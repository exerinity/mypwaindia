import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  preset_stack: { display: 'grid', gap: '10px' },
  preset_stack_row: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  preset_stack_display: { fontSize: '2.2rem', fontWeight: 600, color: 'var(--brand)', fontVariantNumeric: 'tabular-nums' },
  preset_stack_input: {
    backgroundColor: 'color-mix(in srgb, var(--brand) 14%, transparent)',
    borderWidth: 0, borderStyle: 'none', borderBottomWidth: '3px',
    borderBottomStyle: 'solid', borderBottomColor: 'var(--brand)',
    boxShadow: { default: '0 0 0 6px color-mix(in srgb, var(--brand) 10%, transparent)', ':focus': '0 0 0 8px color-mix(in srgb, var(--brand) 14%, transparent)' },
    borderRadius: '4px', outline: 'none', padding: '0 0 2px',
    margin: 0, width: '100%', cursor: { default: 'default', ':focus': 'text' },
    caretColor: 'var(--brand)', fontFamily: 'inherit', transition: 'box-shadow 0.15s',
  },
  card: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' },
  info: { flexGrow: 1, flexShrink: 1, flexBasis: '0%', minWidth: '200px' },
  token: { fontFamily: "ui-monospace, 'JetBrains Mono', Menlo, monospace", fontSize: '0.78rem', color: 'var(--muted)', wordBreak: 'break-all' },
  status: {
    display: 'inline-block', padding: '2px 8px', fontSize: '0.7rem',
    textTransform: 'uppercase', letterSpacing: '0.05em', borderRadius: '999px', fontWeight: 600,
  },
  status_active: { backgroundColor: 'rgba(59, 212, 63, 0.15)', color: 'var(--success)' },
  status_claimed: { backgroundColor: 'rgba(47, 143, 252, 0.15)', color: 'var(--alert-info)' },
  status_cancelled: { backgroundColor: 'rgba(230, 50, 50, 0.15)', color: 'var(--alert-error)' },
  status_expired: { backgroundColor: 'rgba(170, 170, 170, 0.15)', color: 'var(--muted)' },
});

export const link_classes = {
  preset_stack: stylex.props(styles.preset_stack).className,
  preset_stack_row: stylex.props(styles.preset_stack_row).className,
  preset_stack_input: stylex.props(styles.preset_stack_display, styles.preset_stack_input).className,
  card: stylex.props(styles.card).className,
  info: stylex.props(styles.info).className,
  token: stylex.props(styles.token).className,
  status: stylex.props(styles.status).className,
  status_active: stylex.props(styles.status, styles.status_active).className,
  status_claimed: stylex.props(styles.status, styles.status_claimed).className,
  status_cancelled: stylex.props(styles.status, styles.status_cancelled).className,
  status_expired: stylex.props(styles.status, styles.status_expired).className,
};

export function link_status_class(status: string): string {
  const key = `status_${status}` as keyof typeof link_classes;
  return link_classes[key] ?? link_classes.status ?? '';
}
