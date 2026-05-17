import { usePageTitle } from '../hooks/usePageTitle.js';

const DEVELOPERS = [
  {
    name: 'exerinity',
    url: 'https://exerinity.com',
  },
];

const THX = [
  {
    name: 'Razelz',
    url: 'https://razelz.gay',
    idea: 'The "Personal details" code modal under scambait mode',
  },
  {
    name: 'Mystically',
    url: 'https://hello.mystically.dev',
    idea: 'Guiding what scambait mode should mostly look like, spotting out an absurd typo, and API v2',
  },
];

const PACKAGE_GROUPS: { title: string; packages: Package[] }[] = [
  {
    title: 'Runtime',
    packages: [
      { name: 'React', version: 18, license: 'MIT', url: 'https://react.dev' },
      { name: 'React DOM', version: 18, license: 'MIT', url: 'https://react.dev' },
      { name: 'React Router DOM', version: 6, license: 'MIT', url: 'https://reactrouter.com' },
    ],
  },
  {
    title: 'Build tooling',
    packages: [
      { name: 'Vite', version: 6, license: 'MIT', url: 'https://vite.dev' },
      { name: 'TypeScript', version: 6, license: 'Apache-2.0', url: 'https://typescriptlang.org' },
      { name: 'Terser', version: 5, license: 'BSD-2-Clause', url: 'https://terser.org' },
    ],
  },
  {
    title: 'Vite plugins',
    packages: [
      { name: '@vitejs/plugin-react', version: 4, license: 'MIT', url: 'https://github.com/vitejs/vite-plugin-react' },
      { name: 'vite-plugin-pwa', version: 0.21, license: 'MIT', url: 'https://vite-pwa-org.netlify.app' },
      { name: 'vite-plugin-javascript-obfuscator', version: 3, license: 'MIT', url: 'https://github.com/elmeet/vite-plugin-javascript-obfuscator' },
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
      <h1 className="mt-0">Acknowledgements</h1>

      <h2>This app is developed by...</h2>
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

      <h2>and using...</h2>
      {PACKAGE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3>{group.title}</h3>
          <PackageList packages={group.packages} />
        </div>
      ))}
    </>
  );
}
