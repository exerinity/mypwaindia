import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  alert: {
    padding: '10px 14px', margin: '10px 0', borderRadius: 'var(--radius)',
    borderWidth: '1px', borderStyle: 'solid',
  },
  success: { backgroundColor: 'rgba(59, 212, 63, 0.07)', borderColor: 'var(--success)', color: 'var(--fg)' },
  warning: { backgroundColor: 'rgba(255, 195, 0, 0.08)', borderColor: 'var(--alert-warning)', color: 'var(--fg)' },
  info: { backgroundColor: 'rgba(47, 143, 252, 0.07)', borderColor: 'var(--alert-info)', color: 'var(--fg)' },
  error: { backgroundColor: 'rgba(230, 50, 50, 0.07)', borderColor: 'var(--alert-error)', color: 'var(--fg)' },
  banner: {
    backgroundColor: 'var(--alert-warning)', color: 'black', textAlign: 'center',
    paddingTop: '8px',
    paddingRight: { default: '16px', '@media (max-width: 900px)': 'max(16px, env(safe-area-inset-right))' },
    paddingBottom: '8px',
    paddingLeft: { default: '16px', '@media (max-width: 900px)': 'max(16px, env(safe-area-inset-left))' },
    fontSize: '0.9rem', lineHeight: 1.3,
  },
  banner_elev: { backgroundColor: 'var(--bg-elev)', color: 'var(--fg)' },
  banner_error: { backgroundColor: 'var(--alert-error)', color: 'white' },
});

export const alert_classes = {
  alert: stylex.props(styles.alert).className,
  success: stylex.props(styles.alert, styles.success).className,
  warning: stylex.props(styles.alert, styles.warning).className,
  info: stylex.props(styles.alert, styles.info).className,
  error: stylex.props(styles.alert, styles.error).className,
  banner: stylex.props(styles.banner).className,
  banner_elev: stylex.props(styles.banner, styles.banner_elev).className,
  banner_error: stylex.props(styles.banner, styles.banner_error).className,
};
