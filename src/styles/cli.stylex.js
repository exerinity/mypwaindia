import * as stylex from '@stylexjs/stylex';

const cursor_blink = stylex.keyframes({
  '0%, 50%': { opacity: 1 },
  '50.01%, 100%': { opacity: 0 },
});

const styles = stylex.create({
  wrap: {
    display: 'flex', flexDirection: 'column',
    height: 'calc(100dvh - 178px - var(--mpi-bottom-nav-h) - env(safe-area-inset-bottom))',
    minHeight: '320px', backgroundColor: '#000000',
    borderWidth: '2px', borderStyle: 'solid', borderColor: '#ffffff',
    borderRadius: 'var(--radius)',
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', 'Courier New', monospace",
    fontSize: '0.855rem', lineHeight: 1.6, cursor: 'text', overflow: 'hidden',
  },
  wrap_fullscreen: {
    position: 'fixed', inset: 0, height: '100dvh',
    borderRadius: 0, borderWidth: 0, borderStyle: 'none', zIndex: 9999,
  },
  wrap_drawer: {
    flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    height: 'auto', minHeight: 0, borderWidth: 0, borderStyle: 'none',
    borderRadius: 0, fontSize: '0.79rem',
  },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
    padding: '4px 10px', borderBottomWidth: '1px', borderBottomStyle: 'solid',
    borderBottomColor: '#1a1a1a', flexShrink: 0,
  },
  clear_button: {
    backgroundColor: 'transparent', borderWidth: '1px', borderStyle: 'solid',
    borderColor: { default: '#2a2a2a', ':hover': '#555' },
    borderRadius: '3px', color: { default: '#444', ':hover': '#fff' },
    fontFamily: 'inherit', fontSize: '0.68rem', fontWeight: 700,
    letterSpacing: '0.12em', padding: '2px 9px', cursor: 'pointer',
    transition: 'color 0.12s, border-color 0.12s', lineHeight: 1.6,
  },
  output: {
    flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    overflowY: 'auto', padding: '16px 20px 8px',
  },
  output_drawer: { padding: '12px 14px 8px' },
  line: { whiteSpace: 'pre-wrap', wordBreak: 'break-all', minHeight: '1.2em' },
  line_cmd: { color: '#ffffff', paddingTop: '10px', marginBottom: '1px' },
  line_out: { color: '#ffffff' },
  line_ok: { color: '#00ff66' },
  line_err: { color: '#ff4444' },
  line_warn: { color: '#ffcc00' },
  line_info: { color: '#00ccff' },
  line_sep: { display: 'block', height: '6px' },
  input_line: { display: 'flex', alignItems: 'center', gap: '1ch', paddingTop: '10px' },
  prompt: {
    color: '#ffffff', fontWeight: 600, whiteSpace: 'nowrap',
    fontFamily: 'inherit', userSelect: 'none', flexShrink: 0,
  },
  input_field: {
    position: 'relative', flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    minWidth: 0, display: 'flex', alignItems: 'center', overflow: 'hidden',
    backgroundColor: '#000000',
  },
  input: {
    flexGrow: 1, flexShrink: 1, flexBasis: '0%',
    width: 'auto', backgroundColor: 'transparent', borderWidth: 0,
    borderStyle: 'none', borderRadius: 0, outline: 'none', color: '#ffffff',
    fontFamily: 'inherit', fontSize: 'inherit', caretColor: 'transparent',
    padding: 0, minWidth: 0, appearance: 'none', boxShadow: 'none',
    opacity: { default: 1, ':disabled': 0.5 },
  },
  cursor: {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    width: '1ch', height: '1.15em', backgroundColor: '#ffffff',
    mixBlendMode: 'difference', pointerEvents: 'none',
  },
  cursor_idle: { animationName: cursor_blink, animationDuration: '1.05s', animationIterationCount: 'infinite' },
  cursor_busy: { animationName: cursor_blink, animationDuration: '0.26s', animationIterationCount: 'infinite' },
  cursor_typing: { animationName: 'none', opacity: 1 },
  cursor_hollow: {
    animationName: 'none', opacity: 1, backgroundColor: 'transparent',
    boxShadow: 'inset 0 0 0 1.5px #ffffff',
  },
});

export const cli_classes = {
  wrap: stylex.props(styles.wrap).className,
  wrap_fullscreen: stylex.props(styles.wrap, styles.wrap_fullscreen).className,
  wrap_drawer: stylex.props(styles.wrap, styles.wrap_drawer).className,
  topbar: stylex.props(styles.topbar).className,
  clear_button: stylex.props(styles.clear_button).className,
  output: stylex.props(styles.output).className,
  output_drawer: stylex.props(styles.output, styles.output_drawer).className,
  line: stylex.props(styles.line).className,
  line_cmd: stylex.props(styles.line, styles.line_cmd).className,
  line_out: stylex.props(styles.line, styles.line_out).className,
  line_ok: stylex.props(styles.line, styles.line_ok).className,
  line_err: stylex.props(styles.line, styles.line_err).className,
  line_warn: stylex.props(styles.line, styles.line_warn).className,
  line_info: stylex.props(styles.line, styles.line_info).className,
  line_sep: stylex.props(styles.line, styles.line_sep).className,
  input_line: stylex.props(styles.input_line).className,
  prompt: stylex.props(styles.prompt).className,
  input_field: stylex.props(styles.input_field).className,
  input: stylex.props(styles.input).className,
  cursor_idle: stylex.props(styles.cursor, styles.cursor_idle).className,
  cursor_busy: stylex.props(styles.cursor, styles.cursor_busy).className,
  cursor_typing: stylex.props(styles.cursor, styles.cursor_typing).className,
  cursor_hollow: stylex.props(styles.cursor, styles.cursor_hollow).className,
};
