import { useState, useRef, useEffect } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { getDisplayName } from '../utils/display.js';
import { ChevronDown, CloseIcon, PlusIcon, ExternalIcon } from './icons.tsx';
import { ConfirmModal } from './confirm_modal.tsx';

function formatBalance(n: number | undefined) {
  if (n === undefined || n === null) return null;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function AccountPill() {
  const { active, accounts, switchAccount, removeAccount, maxAccounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Account | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!active) {
    return (
      <>
        <Link to="/i/flow/login" className="pill clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className="pill-label">Not logged in</span>
        </Link>
        <a href="https://mypayindia.com/accountservices/register" target="_blank" rel="noopener noreferrer"
          className="pill clickable" style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className="pill-label">Sign up</span><ExternalIcon />
        </a>
        <a href="https://mypayindia.com/" target="_blank" rel="noopener noreferrer"
          className="pill clickable" style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className="pill-label">MyPayIndia.com</span><ExternalIcon />
        </a>
      </>
    );
  }

  const canAdd = accounts.length < maxAccounts;

  return (
    <>
      <div className="acct-dropdown" ref={ref}>
        <button className="pill clickable" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
          <span className="pill-label">Logged in as</span>
          <strong>{getDisplayName(active, settings.displayName)}</strong>
          <ChevronDown />
        </button>

        {open && (
          <div className="acct-dropdown-menu" role="menu">
            <div className="acct-list">
              {accounts.map((acc) => {
                const isActive = acc.id === active.id;
                const balance = formatBalance(acc.lastBalance);
                return (
                  <div key={acc.id} className={`acct-item ${isActive ? 'active' : ''}`}>
                    <button
                      className="acct-switch-btn"
                      disabled={switching}
                      onClick={async () => { setOpen(false); setSwitching(true); await switchAccount(acc.id); }}
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
                      {isActive && <span className="acct-check">✓</span>}
                    </button>
                    <button
                      className="acct-remove"
                      onClick={() => { setOpen(false); setRemoveTarget(acc); }}
                      aria-label={`Remove ${acc.username}`}
                      title="Remove this account"
                    >
                      <CloseIcon size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="acct-footer">
              {canAdd ? (
                <button className="acct-add-btn" onClick={() => { setOpen(false); navigate('/i/flow/login'); }}>
                  <PlusIcon size={13} /> Add another account
                </button>
              ) : (
                <span className="acct-add-btn" style={{ color: 'var(--muted)', cursor: 'default' }}>
                  Account limit reached ({maxAccounts})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => { if (removeTarget) removeAccount(removeTarget.id); setRemoveTarget(null); }}
        title="Remove account"
        message={`Remove ${removeTarget?.username || ''}?`}
        confirmLabel="Remove"
      />
    </>
  );
}
