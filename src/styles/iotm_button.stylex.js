import * as stylex from '@stylexjs/stylex';

const slot_roll = stylex.keyframes({ from: { transform: 'translateY(110%)' }, to: { transform: 'translateY(0)' } });

export const button_styles = stylex.create({
  slot_digit: { display: 'block', animationName: slot_roll, animationDuration: '0.22s', animationTimingFunction: 'cubic-bezier(0.2, 0, 0.2, 1)' },
  button: {
    width: '100%',
    backgroundImage: {
      default: 'linear-gradient(to left, var(--brand) 0%, var(--brand) var(--payout-percentage), var(--success) var(--payout-percentage))',
      ':hover': 'linear-gradient(to left, var(--brand-dark) 0%, var(--brand-dark) var(--payout-percentage), var(--success) var(--payout-percentage))',
    },
    color: {
      default: 'var(--bg)',
      ':hover': 'var(--bg)',
    },
    fontWeight: 700,
    transitionProperty: 'background',
    transitionDuration: '0.08s',
    transitionTimingFunction: 'linear',
  },
});
