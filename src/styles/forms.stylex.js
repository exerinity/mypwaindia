import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  floating: { position: 'relative', marginTop: '16px' },
  floating_compact: { marginTop: 0 },
  floating_input: { paddingTop: '22px', paddingBottom: '8px' },
  floating_input_trailing: { paddingRight: '44px' },
  floating_input_leading: { paddingLeft: '42px' },
  floating_input_leading_trailing: { paddingLeft: '42px', paddingRight: '44px' },
  floating_textarea: { paddingTop: '26px', paddingBottom: '8px' },
  floating_trailing: {
    position: 'absolute', right: '6px', top: '50%',
    transform: 'translateY(-50%)', display: 'flex', alignItems: 'center',
  },
  floating_leading: {
    position: 'absolute', left: '12px', top: '50%',
    transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', color: 'var(--muted)',
  },
  floating_label: {
    position: 'absolute', left: '14px', top: '50%',
    transform: 'translateY(-50%)', fontSize: '1rem',
    color: 'var(--muted)', pointerEvents: 'none',
    transition: 'top 0.15s ease, font-size 0.15s ease, color 0.15s ease, transform 0.15s ease',
    margin: 0, whiteSpace: 'nowrap', overflow: 'hidden',
    maxWidth: 'calc(100% - 28px)', textOverflow: 'ellipsis',
  },
  floating_label_leading: { left: '42px', maxWidth: 'calc(100% - 56px)' },
  floating_textarea_label: { top: '20px', transform: 'none' },
  checkbox_row: {
    display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0',
  },
  toggle_switch: {
    position: 'relative', display: 'inline-block', width: '48px',
    height: '26px', cursor: 'pointer', flexShrink: 0,
  },
  toggle_track: {
    position: 'absolute', inset: 0, backgroundColor: 'var(--border)',
    borderRadius: '13px', transition: 'background 0.2s ease',
    '::before': {
      content: '""', position: 'absolute', width: '20px', height: '20px',
      left: '3px', top: '3px', backgroundColor: '#fff',
      borderRadius: '50%', transition: 'transform 0.2s ease',
    },
  },
});

export const form_classes = {
  floating: stylex.props(styles.floating).className,
  floating_compact: stylex.props(styles.floating, styles.floating_compact).className,
  floating_input: stylex.props(styles.floating_input).className,
  floating_input_trailing: stylex.props(styles.floating_input, styles.floating_input_trailing).className,
  floating_input_leading: stylex.props(styles.floating_input, styles.floating_input_leading).className,
  floating_input_leading_trailing: stylex.props(styles.floating_input, styles.floating_input_leading_trailing).className,
  floating_textarea: stylex.props(styles.floating_textarea).className,
  floating_trailing: stylex.props(styles.floating_trailing).className,
  floating_leading: stylex.props(styles.floating_leading).className,
  floating_label: stylex.props(styles.floating_label).className,
  floating_label_leading: stylex.props(styles.floating_label, styles.floating_label_leading).className,
  floating_textarea_label: stylex.props(styles.floating_label, styles.floating_textarea_label).className,
  checkbox_row: stylex.props(styles.checkbox_row).className,
  toggle_switch: stylex.props(styles.toggle_switch).className,
  toggle_track: stylex.props(styles.toggle_track).className,
};
