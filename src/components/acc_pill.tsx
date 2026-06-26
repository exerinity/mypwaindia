import { useState, useRef, useEffect } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { ChevronDown, CloseIcon, PlusIcon, ExternalIcon, LogoutIcon } from './icons.tsx';
import { useLazyModule } from '../hooks/lazy_module.ts';
import { lazy, Suspense } from 'react';

const ConfirmModal = lazy(() => import('./confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));

function DisplayName({ account, mode }: { account: Account | null; mode: string }) {
  const displayMod = useLazyModule(() => import('../utils/display.js'));
  return <>{displayMod ? displayMod.getDisplayName(account, mode) : ''}</>;
}

export function AccountPill() {
  const { active, accounts, switchAccount, removeAccount, maxAccounts } = useAuth();
  const { settings } = useSettings();
  const moneyMod = useLazyModule(() => import('../utils/money.js'));
  const formatBalance = (n: number | undefined) => (n === undefined || n === null || !moneyMod) ? null : moneyMod.formatINR(n);
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function closeDropdown() {
    setClosing(true);
  }

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
        <a href="/signup" target="_blank" rel="noopener noreferrer"
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

  return (
    <>
      <div className="acct-dropdown" ref={ref}>
        <button className="pill clickable" onClick={() => open ? closeDropdown() : setOpen(true)} aria-haspopup="menu" aria-expanded={open}>
          <span className="pill-label">Logged in as</span>
          <strong><DisplayName account={active} mode={settings.displayName} /></strong>
          <ChevronDown />
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
                      disabled={switching}
                      onClick={async () => { closeDropdown(); setSwitching(true); await switchAccount(acc.id); }}
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
                      onClick={() => { closeDropdown(); setRemoveTarget(acc); }}
                      aria-label={`Remove ${acc.username}`}
                      title="Remove this account"
                    >
                      <span className="acct-icon-check">✓</span>
                      <span className="acct-icon-x"><CloseIcon size={13} /></span>
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="acct-footer">
              {canAdd ? (
                <button className="acct-add-btn" onClick={() => { closeDropdown(); navigate('/i/flow/login', { state: { backgroundLocation: location } }); }}>
                  <PlusIcon size={13} /> Add an account
                </button>
              ) : (
                <span className="acct-add-btn" style={{ color: 'var(--muted)', cursor: 'default' }}>
                  Account limit at capacity ({maxAccounts})
                </span>
              )}
              <button className="acct-add-btn" onClick={() => { closeDropdown(); navigate('/i/flow/logout', { state: { backgroundLocation: location } }); }}>
                Log out <LogoutIcon size={13} />
              </button>
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
