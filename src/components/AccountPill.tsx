import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { getDisplayName } from '../utils/display.js';
import { ChevronDown, CloseIcon, PlusIcon } from './Icons.jsx';
import { ConfirmModal } from './ConfirmModal.jsx';

export function AccountPill() {
  const { active, accounts, switchAccount, removeAccount, maxAccounts } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!active) return null;

  const canAdd = accounts.length < maxAccounts;

  return (
    <>
      <div className="acct-dropdown" ref={ref}>
        <button
          className="pill clickable"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="pill-label">Logged in as</span>
          <strong>{getDisplayName(active, settings.displayName)}</strong>
          <ChevronDown />
        </button>
        {open && (
          <div className="acct-dropdown-menu" role="menu">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className={`acct-item ${acc.id === active.id ? 'active' : ''}`}
              >
                <button
                  className="acct-username"
                  style={{ background: 'transparent', border: 'none', color: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left', flex: 1 }}
                  onClick={() => { switchAccount(acc.id); setOpen(false); }}
                >
                  {acc.firstName || acc.lastName
                    ? <>{acc.firstName} {acc.lastName} <span className="muted" style={{ fontSize: '0.85em' }}>(@{acc.username})</span></>
                    : acc.username}
                </button>
                <button
                  className="acct-remove"
                  onClick={() => { setOpen(false); setRemoveTarget(acc); }}
                  aria-label={`Remove ${acc.username}`}
                  title="Remove this account"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ))}
            {canAdd ? (
              <button
                className="acct-item"
                style={{ color: 'var(--brand)', background: 'transparent', textAlign: 'left', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => { setOpen(false); navigate('/i/flow/login'); }}
              >
                <PlusIcon size={14} /> Add another account
              </button>
            ) : (
              <div className="acct-item" style={{ cursor: 'default', color: 'var(--muted)', fontSize: '0.8rem' }}>
                You can only have up to {maxAccounts} accounts logged in. Why do you even...?!?!
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={() => {
          if (removeTarget) removeAccount(removeTarget.id);
          setRemoveTarget(null);
        }}
        title="Remove account"
        message={`Remove ${removeTarget?.username || ''}?`}
        confirmLabel="Remove"
      />
    </>
  );
}