import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  option: {
    width: '100%', display: 'inline-flex', flexDirection: 'column',
    alignItems: 'flex-start', justifyContent: 'center', gap: '3px',
    padding: '14px 16px', borderWidth: '1px', borderStyle: 'solid',
    borderColor: 'var(--border)', borderRadius: 'var(--radius)',
    backgroundColor: { default: 'transparent', ':hover': 'var(--bg-elev)', ':disabled': 'transparent !important' },
    color: { default: 'var(--fg)', ':disabled': 'var(--fg) !important' },
    textAlign: 'left', lineHeight: 1.2, textDecoration: 'none',
    fontFamily: 'inherit', fontSize: '0.95rem', fontWeight: 500,
    cursor: 'pointer',
    opacity: { default: 1, ':disabled': 0.4 },
    transition: 'background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease, transform 0.05s ease',
    boxShadow: 'none',
  },
  option_label: { fontWeight: 600, fontSize: '0.95rem' },
  option_desc: { fontSize: '0.83rem', color: 'var(--muted)', fontWeight: 400 },
  row: { display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '8px 0' },
  copy_button: {
    backgroundColor: { default: 'transparent', ':hover': 'var(--bg-elev)' },
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    color: 'var(--fg)', padding: '4px 10px', fontSize: '0.78rem', borderRadius: '6px',
  },
});

export const button_classes = {
  option: stylex.props(styles.option).className,
  option_label: stylex.props(styles.option_label).className,
  option_desc: stylex.props(styles.option_desc).className,
  row: stylex.props(styles.row).className,
  copy_button: stylex.props(styles.copy_button).className,
};
