import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/page_title.js';

export default function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <>
      <h1 className="mt-0">404</h1>
      <p className="muted">
        Hmm... this page doesn't exist. Try going back to the dashboard?
      </p>
      <Link to="/dash" className="btn">Back to dashboard</Link>
    </>
  );
}