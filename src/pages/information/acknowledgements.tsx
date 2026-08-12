import { Link } from 'react-router-dom';
import { ExternalIcon } from '../../components/ui/icons.js';
import { usePageTitle } from '../../hooks/page_title.js';

const DEVELOPERS = [
  {
    name: 'exerinity',
    url: 'https://exerinity.com'
  },
];

const THX = [
  {
    name: 'Razelz',
    url: 'https://www.razelz.org',
    idea: 'Idea: the "Personal details" OTP modal under scambait mode',
  },
  {
    name: 'Mystically',
    url: 'https://mystically.dev',
    idea: 'Further scambait mode influence',
  },
  {
    name: 'tiago',
    url: 'https://tiago.zip',
    idea: 'Helping out with the original PWA (redesigning it), and the splash screen & account switcher (on the original)'
  },
  {
    name: 'IBM_PC',
    url: 'https://ibmpc.gr',
    idea: <>Wrote the CSS for <Link to="/iotm/button">the button</Link> on <a href="https://mypayindia.com/iotm/button/" target="_blank">the main site</a> that I "borrowed"</>
  },
  {
    name: 'you!',
    idea: 'for giving MyPWAIndia a try'
  }
];

const INSPIRATIONS = [
  {
    name: 'Twitter',
    url: 'https://twitter.dev',
    idea: 'Settings (v2) layout idea, and routing scheme (/i/flow, etc), tab title ("This / MyPayIndia" "That / Twitter")',
  },
  {
    name: 'The main website',
    idea: 'General layout and design inspiration'
  }
];

const PACKAGE_GROUPS: { title: string; packages: Package[] }[] = [
  {
    title: 'API',
    packages: [
      { name: 'MyPayIndia API', version: 2, url: 'https://mypayindia.com/docs/api' },
    ],
  },
  {
    title: 'Runtime',
    packages: [
      { name: 'React', version: 18, license: 'MIT', url: 'https://react.dev' },
      { name: 'React DOM', version: 18, license: 'MIT', url: 'https://react.dev' },
      { name: 'React Router DOM', version: 6, license: 'MIT', url: 'https://reactrouter.com' },
    ],
  },
  {
    title: 'Miscellaneous',
    packages: [
      { name: 'react-globe.gl', version: 2, license: 'MIT', url: 'https://github.com/vasturiano/react-globe.gl' },
      { name: 'Three.js', version: 0.185, license: 'MIT', url: 'https://threejs.org' },
      { name: '@twemoji/api', version: 17, license: 'MIT / CC-BY-4.0', url: 'https://github.com/jdecked/twemoji' },
    ],
  },
  {
    title: 'Build tooling',
    packages: [
      { name: 'Vite', version: 6, license: 'MIT', url: 'https://vite.dev' },
      { name: 'TypeScript', version: 6, url: 'https://typescriptlang.org' },
    ],
  },
  {
    title: 'Vite plugins',
    packages: [
      { name: '@vitejs/plugin-react', version: 4, license: 'MIT', url: 'https://github.com/vitejs/vite-plugin-react' },
      { name: 'vite-plugin-pwa', version: 0.21, license: 'MIT', url: 'https://vite-pwa-org.netlify.app' },
    ],
  },
  {
    title: 'Fonts',
    packages: [
      { name: 'Inter', license: 'OFL-1.1', url: 'https://github.com/rsms/inter' },
    ],
  },
];

interface Package { name: string; version?: number; license?: string; url?: string }
function PackageList({ packages }: { packages: Package[] }) {
  return (
    <div className="card mb-2" style={{ padding: 0 }}>
      {packages.map((pkg, i) => (
        <div
          key={pkg.name}
          style={{
            borderBottom: i < packages.length - 1 ? '1px solid var(--border)' : 'none',
            padding: '12px 16px',
          }}
        >
          <div className="row spread" style={{ alignItems: 'baseline', gap: 8 }}>
            <strong>
              {pkg.url
                ? <a href={pkg.url} target="_blank" rel="noopener noreferrer">{pkg.name}</a>
                : pkg.name}
              {pkg.version && <>{' '}<span className="muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>v{pkg.version}</span></>}
            </strong>
            {pkg.license && <span className="muted" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{pkg.license}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AcknowledgementsPage() {
  usePageTitle('Acknowledgements');
  return (
    <>
      <h1 className="mt-0">Acknowledgements, about and credits</h1>

      <p className="mt-0 mb-0">The second incarnation of the MyPayIndia PWA ("MyPWAIndia", "MyReactPWAIndia") is a heavy-duty, alternative, modernized web app with roughly 90% of the functionality of the main website. That remaining 10% is the account management and Investment Opportunities™ (excl <Link to="/iotm/button">the button</Link>). The first incarnation was written in vanilla JavaScript and is relatively lightweight, but it is "frozen-in-time" and uses the deprecated v1 API. This app was born pretty shortly after API v2 debuted. <a href="https://github.com/exerinity/mypwaindia" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>View the source for this app <ExternalIcon size={12} /></a></p>

      <p className="mt-0 mb-0">This is a list of everything and everybody who made it possible:</p>

      <h2>This app is programmed entirely by...</h2>
      <div className="card mb-2" style={{ padding: 0 }}>
        {DEVELOPERS.map((dev, i) => (
          <div
            key={dev.name}
            style={{
              borderBottom: i < DEVELOPERS.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '12px 16px',
            }}
          >
            <strong>
              {dev.url
                ? <a href={dev.url} target="_blank" rel="noopener noreferrer">{dev.name}</a>
                : dev.name}
            </strong>
          </div>
        ))}
      </div>

      <h2>with thanks to...</h2>
      <div className="card mb-2" style={{ padding: 0 }}>
        {THX.map((person, i) => (
          <div
            key={person.name}
            style={{
              borderBottom: i < THX.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '12px 16px',
            }}
          >
            <strong>
              {person.url
                ? <a href={person.url} target="_blank" rel="noopener noreferrer">{person.name}</a>
                : person.name}
            </strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>{person.idea}</p>
          </div>
        ))}
      </div>

      <h2>taking inspiration from...</h2>
      <div className="card mb-2" style={{ padding: 0 }}>
        {INSPIRATIONS.map((person, i) => (
          <div
            key={person.name}
            style={{
              borderBottom: i < INSPIRATIONS.length - 1 ? '1px solid var(--border)' : 'none',
              padding: '12px 16px',
            }}
          >
            <strong>
              {person.url
                ? <a href={person.url} target="_blank" rel="noopener noreferrer">{person.name}</a>
                : person.name}
            </strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>{person.idea}</p>
          </div>
        ))}
      </div>

      <h2>and using...</h2>
      {PACKAGE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3>{group.title}</h3>
          <PackageList packages={group.packages} />
        </div>
      ))}
      <p className="mt-0 mb-0"><a href="https://github.com/exerinity/mypwaindia/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>MyPWAIndia is open-source under the MIT license <ExternalIcon size={12} /></a></p>
      <a href="/i/exquisite_imagery/meow.jpg" target="_blank" rel="noopener noreferrer">
        <img src="/i/exquisite_imagery/meow.jpg" style={{ maxWidth: '50%' }} />
      </a>
    </>
  );
}
