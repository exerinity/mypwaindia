import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';

export function RequireAuth() {
  const { active } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const warned = useRef<boolean>(false);

  useEffect(() => {
    if (!active && !warned.current) {
      warned.current = true;
      toast.warning('You need to be logged in to access this page');
      navigate('/i/flow/login', { replace: true, state: { from: location } });
    }
  }, [active]);

  if (!active) return null;
  return <Outlet />;
}
