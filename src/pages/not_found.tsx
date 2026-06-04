import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';
import { ExternalIcon } from '../components/icons.tsx';

export default function NotFoundPage() {
  usePageTitle('?');
  const { pathname } = useLocation();
  return (
    <>
      <h1 className="mt-0">404</h1>
      <p className="muted">
        Hmm... this page doesn't exist. Try going back to the dashboard?
      </p>
      <div className="btn-row">
        <Link to="/dash" className="btn">Back to dashboard</Link>
        <a
          href={`https://mypayindia.com${pathname}`}
          className="btn secondary"
          target="_blank"
          rel="noreferrer"
        >Try on MyPayIndia.com <ExternalIcon size={11} /></a>
        <a
          href={`https://legacy.app.mypayindia.com${pathname}`}
          className="btn secondary"
          target="_blank"
          rel="noreferrer"
        >Try on legacy app <ExternalIcon size={11} /></a>
      </div>
      <small><i>(if you're certain there should be something here, refresh the page with CTRL+Shift+R, the cached router might be out of date)</i></small>
    </>
  );
}