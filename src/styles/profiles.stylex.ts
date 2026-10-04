import * as stylex from '@stylexjs/stylex';

const styles = stylex.create({
  prose: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' },
  banner: { display: 'block', width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: 'var(--radius)' },
  avatar: { display: 'block', width: '128px', height: '128px', borderWidth: '2px', borderStyle: 'solid', borderColor: 'var(--border)', borderRadius: 'inherit', objectFit: 'cover', position: 'relative', boxSizing: 'border-box' },
  avatar_frame: { position: 'relative', width: '128px', height: '128px', borderRadius: '24px' },
  avatar_frame_with_banner: { marginTop: '-64px', marginLeft: '8px' },
  avatar_accessory: { position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'translateY(-26%)', overflow: 'visible', pointerEvents: 'none' },
  image: { maxWidth: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: 'var(--radius)' },
  section_summary: { cursor: 'pointer', listStyle: 'none', '::-webkit-details-marker': { display: 'none' } },
});

export const profile_classes = {
  prose: stylex.props(styles.prose).className,
  banner: stylex.props(styles.banner).className,
  avatar: stylex.props(styles.avatar).className,
  avatar_frame: stylex.props(styles.avatar_frame).className,
  avatar_frame_with_banner: stylex.props(styles.avatar_frame, styles.avatar_frame_with_banner).className,
  avatar_accessory: stylex.props(styles.avatar_accessory).className,
  image: stylex.props(styles.image).className,
  section_summary: stylex.props(styles.section_summary).className,
};
