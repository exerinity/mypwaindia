import { Link, useLocation } from 'react-router-dom';
import { usePageTitle } from '../../hooks/page_title';

export default function OpsecPage() {
  const location = useLocation();
  usePageTitle('MyOPSECIndia');

  return (
    <Link
      to="/i/flow/opsec"
      state={{ backgroundLocation: location }}
      className="btn"
    >
      OPSEC
    </Link>
  );
}
