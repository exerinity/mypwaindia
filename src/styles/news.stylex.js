import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  headline_link: { textDecoration: { default: 'none', ':hover': 'underline' } },
  headline_title: { color: 'var(--brand)' },
  premium_link: { marginLeft: 'auto' },
  body: { marginTop: '8px', fontSize: '0.95rem', lineHeight: 1.6 },
});

export const news_classes = {
  headline_link: stylex.props(styles.headline_link).className,
  headline_title: stylex.props(styles.headline_title).className,
  premium_link: stylex.props(styles.premium_link).className,
  body: stylex.props(styles.body).className,
};
