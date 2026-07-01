import { Component } from 'react';
import type { ReactNode } from 'react';
import { ExternalIcon } from './icons.tsx';

const CHUNK_ERROR = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const isChunkError = CHUNK_ERROR.test(error.message);

    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: '#121212', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div style={{ background: '#171717', border: '1px solid #333', borderRadius: 10, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 2px 8px rgba(0,0,0,0.6)', textAlign: 'center', color: '#eaeaea' }}>
          <img src="/i/mypayindia-full.webp" alt="MyPayIndia" width={135} height={50} style={{ marginBottom: 20 }} />
          <h2 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>Well, this is awkward...</h2>
          <p>Something went seriously awry trying to load this page/view and the app was halted to prevent further issues. The error is:</p>
          <p style={{ color: '#aaa', fontSize: '0.9rem', margin: '0 0 20px' }}>
            {isChunkError
              ? "A required part of the app couldn't be loaded. This usually happens when the app has been updated since this page was opened, or you are intentionally blocking scripts."
              : (error.message || 'The app crashed for an unknown reason.')}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()} style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 16px', borderRadius: 8, background: '#d03505', color: '#fff', fontSize: '0.875rem', fontWeight: 500, border: 'none', cursor: 'pointer' }}>Reload</button>
            <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, background: 'transparent', color: '#eaeaea', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #333', cursor: 'pointer', textDecoration: 'none' }}>MyPayIndia.com <ExternalIcon size={12} /></a>
            <button onClick={() => window.location.href = `/dash?_=${Date.now()}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '9px 16px', borderRadius: 8, background: 'transparent', color: '#eaeaea', fontSize: '0.875rem', fontWeight: 500, border: '1px solid #333', cursor: 'pointer' }}>Hard reload</button>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #2a2a2a', margin: '20px 0 16px' }} />
          <p style={{ color: '#aaa', fontSize: '0.78rem', margin: 0 }}>
            Try reloading with CTRL+Shift+R, or clear the data for this website. If you see this more than twice, please{' '}
            <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" style={{ color: '#aaa', textDecoration: 'underline' }}>join the Discord server and let @exerinity know</a>.
          </p>
        </div>
      </div>
    );
  }
}
