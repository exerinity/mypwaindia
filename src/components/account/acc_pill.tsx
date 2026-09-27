import { useState, useRef, useEffect, useCallback } from 'react';
import type { Account } from '../../context/auth_ctx.tsx';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { ChevronDown, CloseIcon, CheckIcon, PlusIcon, ExternalIcon, LogoutIcon } from '../ui/icons.tsx';
import { useLazyModule } from '../../hooks/lazy_module.ts';
import { lazy, Suspense } from 'react';

const ConfirmModal = lazy(() => import('../ui/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
const DRAG_SLOP = 8;

function DisplayName({ account, mode }: { account: Account | null; mode: string }) {
  const displayMod = useLazyModule(() => import('../../utils/display.js'));
  return displayMod
    ? <>{displayMod.getDisplayName(account, mode)}</>
    : <span className="spinner" style={{ verticalAlign: 'middle' }} />;
}

export function AccountPill() {
  const { active, accounts, switchAccount, removeAccount, maxAccounts } = useAuth();
  const { settings } = useSettings();
  const moneyMod = useLazyModule(() => import('../../utils/money.js'));
  const formatBalance = (n: number | undefined) => (n === undefined || n === null || !moneyMod) ? null : moneyMod.formatINR(n);
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
  const suppressPillClick = useRef(false);
  const switchingRef = useRef(false);

  function closeDropdown() {
    setClosing(true);
  }

  const selectAccount = useCallback((id: number) => {
    if (switchingRef.current) return;
    switchingRef.current = true;
    setClosing(true);
    setSwitching(true);
    void switchAccount(id);
  }, [switchAccount]);

  const requestRemoveAccount = useCallback((id: number) => {
    const account = accounts.find((acc) => acc.id === id);
    if (!account) return;
    setClosing(true);
    if (accounts.length === 1) {
      navigate('/logout');
      return;
    }
    setRemoveTarget(account);
  }, [accounts, navigate]);

  useEffect(() => {
    function onMouseDown() {
      dragStart.current = null;
    }

    function onMouseUp(e: MouseEvent) {
      const start = dragStart.current;
      if (!start || e.button !== 0) return;
      dragStart.current = null;
      window.setTimeout(() => { suppressPillClick.current = false; }, 0);

      if (Math.hypot(e.clientX - start.x, e.clientY - start.y) <= DRAG_SLOP) return;
      const target = e.target instanceof Element ? e.target : null;
      const button = target?.closest<HTMLButtonElement>('.acct-switch-btn');
      if (button && ref.current?.contains(button) && !button.disabled) {
        const id = Number(button.dataset.accountId);
        if (Number.isFinite(id)) selectAccount(id);
      } else {
        const removeButton = target?.closest<HTMLButtonElement>('.acct-remove');
        if (removeButton && ref.current?.contains(removeButton)) {
          const id = Number(removeButton.dataset.accountId);
          if (Number.isFinite(id)) requestRemoveAccount(id);
        } else {
          const link = target?.closest<HTMLAnchorElement>('a[data-drag-route]');
          const route = link?.dataset.dragRoute;
          if (link && route && ref.current?.contains(link)) {
            closeDropdown();
            navigate(route);
          } else if (!target || !ref.current?.contains(target)) {
            closeDropdown();
          }
        }
      }
    }

    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('mouseup', onMouseUp, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    };
  }, [selectAccount, requestRemoveAccount, navigate]);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) closeDropdown();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!active) {
    return (
      <>
        <Link to="/i/flow/login" state={{ backgroundLocation: location }} className="pill clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="pill-label">Not logged in - log in here</span>
        </Link>
        <a href="https://mypayindia.com/auth/register" target="_blank" rel="noopener noreferrer"
          className="pill clickable" style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className="pill-label">Sign up</span><ExternalIcon />
        </a>
        <a href="https://mypayindia.com/" target="_blank" rel="noopener noreferrer"
          className="pill clickable" style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className="pill-label">Home</span><ExternalIcon />
        </a>
      </>
    );
  }

  const canAdd = accounts.length < maxAccounts;
  const isOnlyAccount = accounts.length === 1;

  return (
    <>
      <div className="acct-dropdown" ref={ref}>
        <button
          className="pill clickable"
          onMouseDown={(e) => {
            if (e.button !== 0 || (open && !closing)) return;
            dragStart.current = { x: e.clientX, y: e.clientY };
            suppressPillClick.current = true;
            setClosing(false);
            setOpen(true);
          }}
          onClick={() => {
            if (suppressPillClick.current) { suppressPillClick.current = false; return; }
            if (open && !closing) closeDropdown();
            else { setClosing(false); setOpen(true); }
          }}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="pill-label">Logged in as</span>
          <strong><DisplayName account={active} mode={settings.displayName} /></strong>
          <span className={`acct-chevron${open && !closing ? ' acct-chevron-open' : ''}`}><ChevronDown /></span>
        </button>

        {(open || closing) && (
          <div
            className={`acct-dropdown-menu${closing ? ' acct-dropdown-closing' : ''}`}
            role="menu"
            onAnimationEnd={() => { if (closing) { setClosing(false); setOpen(false); } }}
          >
            <div className="acct-list">
              {accounts.map((acc) => {
                const isActive = acc.id === active.id;
                const balance = formatBalance(acc.lastBalance);
                return (
                  <div key={acc.id} className={`acct-item ${isActive ? 'active' : ''}`}>
                    <button
                      className="acct-switch-btn"
                      data-account-id={acc.id}
                      disabled={switching}
                      onClick={() => selectAccount(acc.id)}
                    >
                      <span className="acct-info">
                        <span className="acct-name">
                          {acc.firstName || acc.lastName
                            ? <>{`${acc.firstName || ''} ${acc.lastName || ''}`.trim()}<span className="acct-handle"> @{acc.username}</span></>
                            : acc.username}
                        </span>
                        <span className="acct-meta">
                          {acc.role && <span className="acct-badge">{acc.role}</span>}
                          {acc.env === 'staging' && <span className="acct-badge acct-badge-staging">staging</span>}
                          {balance && <span className="acct-balance">{balance}</span>}
                        </span>
                      </span>
                    </button>
                    <button
                      className={`acct-remove${isActive ? ' acct-remove-active' : ''}`}
                      data-account-id={acc.id}
                      onClick={() => requestRemoveAccount(acc.id)}
                      aria-label={isOnlyAccount ? 'Log out' : `Remove ${acc.username}`}
                      title={isOnlyAccount ? 'Log out' : 'Remove this account'}
                    >
                      {isOnlyAccount ? <LogoutIcon size={13} /> : (
                        <>
                          <span className="acct-icon-check"><CheckIcon size={13} /></span>
                          <span className="acct-icon-x"><CloseIcon size={13} /></span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="acct-footer">
              {canAdd ? (
                <Link to="/login" data-drag-route="/login" className="acct-add-btn" onClick={closeDropdown}>
                  <PlusIcon size={13} /> Add an account
                </Link>
              ) : (
                <span className="acct-add-btn" style={{ color: 'var(--muted)', cursor: 'default' }}>
                  Account limit at capacity ({maxAccounts})
                </span>
              )}
              <Link to="/logout" data-drag-route="/logout" className="acct-add-btn" onClick={closeDropdown}>
                Log out <LogoutIcon size={13} />
              </Link>
            </div>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        <ConfirmModal
          open={!!removeTarget}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => { if (removeTarget) removeAccount(removeTarget.id); setRemoveTarget(null); }}
          title="Remove account"
          message={`Remove ${removeTarget?.username || ''}?`}
          confirmLabel="Remove"
        />
      </Suspense>
    </>
  );
}
