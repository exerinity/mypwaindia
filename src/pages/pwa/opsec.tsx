import { Link, useLocation } from 'react-router-dom';

export default function OpsecPage() {
  return ( <Link to="/i/flow/opsec" state={{ backgroundLocation: useLocation() }} className="btn">OPSEC</Link> );
}