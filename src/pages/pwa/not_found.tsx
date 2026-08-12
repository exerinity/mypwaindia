import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title.js';
import { ExternalIcon } from '../../components/ui/icons.tsx';

export default function NotFoundPage() {
  usePageTitle('?');
  const { pathname } = useLocation();
  return (
    <>
      <h1 className="mt-0">404</h1>
      <div className="btn-row">
        <Link to="/dash" className="btn">Back to dashboard</Link>
        <a
          href={`https://mypayindia.com${pathname}`}
          className="btn secondary"
          target="_blank"
          rel="noreferrer"
        >Try on MyPayIndia.com <ExternalIcon size={11} /></a>
      </div>
    </>
  );
}