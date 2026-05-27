import { useState, useRef, useEffect } from 'react';
import type { Account } from '../context/auth_ctx.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { getDisplayName } from '../utils/display.js';
import { ChevronDown, CloseIcon, PlusIcon, ExternalIcon } from './icons.tsx';
import { ConfirmModal } from './confirm_modal.tsx';
import { formatINR } from '../utils/money.js';

function formatBalance(n: number | undefined) {
  if (n === undefined || n === null) return null;
  return formatINR(n);
}

export function AccountPill() {
  const { active, accounts, switchAccount, removeAccount, maxAccounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
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
        <Link to="/i/flow/login" className="pill clickable" style={{ textDecoration: 'none', color: 'inherit' }}>
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
          <strong>{getDisplayName(active, settings.displayName)}</strong>
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
                <button className="acct-add-btn" onClick={() => { closeDropdown(); navigate('/i/flow/login'); }}>
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
