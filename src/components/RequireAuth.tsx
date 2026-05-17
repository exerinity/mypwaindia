import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { useToast } from '../context/ToastContext.tsx';

export function RequireAuth() {
  const { active } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const warned = useRef<boolean>(false);

  useEffect(() => {
    if (!active && !warned.current) {
      warned.current = true;
      toast.warning('You are not logged in and are not permitted to perform this action.');
      navigate('/i/flow/login', { replace: true, state: { from: location } });
    }
  }, [active]);

  if (!active) return null;
  return <Outlet />;
}
