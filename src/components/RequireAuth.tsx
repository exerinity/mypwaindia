import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export function RequireAuth({ children }) {
  const { active } = useAuth();
  const location = useLocation();
  if (!active) {
    return <Navigate to="/i/flow/login" replace state={{ from: location }} />;
  }
  return children;
}
