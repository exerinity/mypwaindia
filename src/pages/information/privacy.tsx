import { Link } from 'react-router-dom';
import { ExternalIcon } from '../../components/ui/icons.js';
const UPDATED = '9th August 2026';

const LOCAL_KEYS = [
  { key: 'mpi_accounts', what: 'your saved accounts, up to 10, including usernames, display info and the session token for each' },
  { key: 'mpi_active_account', what: 'which of those accounts is currently selected' },
  { key: 'mpi_settings', what: 'theme, accent colour, home page, speed dials, auto-refresh, service worker toggle, etc. basically the forefront of settings' },
  { key: 'mpi_app_lock', what: 'your app lock, stored as a SHA-256 hash with a random 16-byte salt. which, that lock can be defeated by deleting this, but whatever...' },
  { key: 'mpi_app_lock_last_unlock', what: 'when you last unlocked, so the app knows when to ask again' },
  { key: 'accepted_onboard', what: <>if you accepted <Link to="/i/flow/onboarding">the onboarding flow</Link></> },
  { key: 'mpi_hide', what: 'which dismissable components you have... dismissed' },
  { key: 'mpi_last_version', what: 'the last version you ran, used to show you release notes' },
  { key: 'mpi_recent_accents', what: 'accent colours you have used recently' },
  { key: 'mpi_sidebar_collapsed', what: 'categories of items in the sidebar you collapsed' },
];

const SERVER_STORES = [
  {
    name: 'Settings sync',
    where: 'Cloudflare KV',
    what: 'if you turn it on, your app settings (theme, accent, layout preferences) are stored against your MyPayIndia user id, 64KB maximum. turning sync off or deleting them removes the stored copy',
  },
];

function Rows({ items }: { items: { title: React.ReactNode; body: React.ReactNode }[] }) {
  return (
    <div className="card mb-2" style={{ padding: 0 }}>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none',
            padding: '12px 16px',
          }}
        >
          <strong>{item.title}</strong>
          <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>{item.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <h1 className="mt-0">MyPWAIndia privacy policy</h1>
      <p className="muted mt-0" style={{ fontSize: '0.875rem' }}>Last updated: {UPDATED}</p>

      <p className="mt-0 mb-0">
        This covers MyPWAIndia, the app you are looking at right now. It is an official but alternative client for{' '}
        <a href="https://mypayindia.com" target="_blank" rel="noopener noreferrer">MyPayIndia</a>, and it is built and run
        separately from the main website by one person (<Link to="/i/team?highlight=exerinity">exerinity</Link>). In other words, this is an operationally separate app that talks to MyPayIndia's servers, but it is officially listed and endorsed.
      </p>

      <p className="mt-0 mb-0">
        That separation is critical - everything to do with your actual account (your email address, your password, your
        balance) is on MyPayIndia's servers and is covered by{' '}
        <a href="https://mypayindia.com/privacy" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          their privacy policy <ExternalIcon size={12} />
        </a>. This page is about the extra bits that this app puts on top.
      </p>

      <h2>Local storage keys</h2>
      <p className="mt-0 mb-0">Most of what this app knows about you never leaves your browser. It stays in local storage:</p>
      <div className="card mb-0 mt-0" style={{ padding: 0 }}>
        {LOCAL_KEYS.map((row, i) => (
          <div
            key={row.key}
            style={{
              borderBottom: i < LOCAL_KEYS.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '12px 16px',
            }}
          >
            <strong style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>{row.key}</strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>{row.what}</p>
          </div>
        ))}
      </div>
      <p className="mb-0">
        You can wipe all of it whenever you like from <Link to="/settings/data">settings</Link>, under Delete all storage
      </p>

      <h2 className="mt-0 mb-0">Cookies!</h2>
      <p className="mt-0 mb-0">
        Two, and both are strictly necessary to keep you logged in: <code>auth_token</code> and <code>PHPSESSID</code>. Both
        are HttpOnly, Secure and SameSite=Strict. They are set when you log in and expired when you log out through{' '}
        <Link to="/i/flow/logout">here</Link>.
      </p>
      <p className="mt-0 mb-0">
        Your session lives in two places, that cookie and the token in local storage. Deleting the
        cookie on its own will not sign you out
      </p>

      <h2 className="mt-0 mb-0">The gateway</h2>
      <p className="mt-0 mb-0">
        Every request this app makes to MyPayIndia goes through a Cloudflare Worker at <code>/i/api</code>. It forwards your request upstream and hands the answer back. It has to see your session token
        in order to do that, but it does not keep a copy
      </p>

      <h2 className="mt-0 mb-0">What is stored on MyPWAIndia's side</h2>
      <p className="mt-0 mb-0">One thing, on Cloudflare:</p>
      <div className="mt-0">
        <Rows items={SERVER_STORES.map((s) => ({ title: <>{s.name} ({s.where})</>, body: s.what }))} />
      </div>

      <h2 className="mt-0 mb-0">Analytics</h2>
      <p className="mt-0 mb-0">
        This app uses <a href="https://umami.is" target="_blank" rel="noopener noreferrer">Umami</a>, self-hosted by MyPayIndia. This app has a site on the instance. It uses no cookies, anonymises IP addresses, does no cross-site tracking, and is only
        ever looked at in aggregate
      </p>

      <h2 className="mt-0 mb-0">Cloudflare</h2>
      <p className="mt-0 mb-0">
        This whole thing runs on Cloudflare: the static files, the Worker and KV. Worker observability logging is switched
        on, so Cloudflare receives the usual request
        metadata (IP address, timestamp, requested path, user agent, response status) for requests to this app. Cloudflare acts as the processor here and{' '}
        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          their own privacy policy <ExternalIcon size={12} />
        </a>{' '}
        covers what they do with it
      </p>

      <h2>Other things</h2>
      <Rows
        items={[
          { title: 'twemoji.exerinity.com', body: <>Twitter's <a href="https://github.com/twitter/twemoji" target="_blank" rel="noopener noreferrer">Twemoji</a>, forked</> },
          { title: 'mypayindia.com', body: 'obviously' },
        ]}
      />

      <h2>Remove things</h2>
      <Rows
        items={[
          { title: 'Everything stored locally', body: <>delete all storage in <Link to="/settings/data">settings</Link></> },
          { title: 'Synced settings', body: <>turn sync off or delete them, also in <Link to="/settings/data">settings</Link></> },
          { title: 'Your MyPayIndia account', body: <><a href="https://mypayindia.com/account/settings">log in to MyPayIndia</a></> },
        ]}
      />

      <h2 className="mt-0 mb-0">You can check all of this</h2>
      <p className="mt-0 mb-0">
        Nothing on this page is something you have to take my word for. The app is open source under MIT at{' '}
        <a href="https://github.com/exerinity/mypwaindia" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          exerinity/mypwaindia <ExternalIcon size={12} />
        </a>, the shipped build is deliberately unminified so you can (kinda, godspeed) read it in devtools, and the Worker that does all of
        the above is in <code>src/worker/</code>. If this page and the code ever disagree, the code is right and I have made
        a mistake, so let me know!
      </p>

      <h2>Ask about MyPWAIndia</h2>
      <p className="mt-0 mb-0">
        Please join the <a href="https://discord.com/invite/A4ZKY4JGCy" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          the Discord <ExternalIcon size={12} />
        </a>{' '}
        and mention @exerinity in the #dev channel.
      </p>
    </>
  );
}
