import { utility_classes } from '../../styles/utils.stylex.ts';
import { shell_classes } from '../../styles/shell.stylex.ts';
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
    : <span className={`spinner ${utility_classes.spinner}`} style={{ verticalAlign: 'middle' }} />;
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
  const [hovered_account_id, set_hovered_account_id] = useState<number | null>(null);
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
        <Link to="/i/flow/login" state={{ backgroundLocation: location }} className={`pill clickable ${shell_classes.pill_clickable}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <span className={`pill-label ${shell_classes.pill_label}`}>Not logged in - log in here</span>
        </Link>
        <a href="https://mypayindia.com/auth/register" target="_blank" rel="noopener noreferrer"
          className={`pill clickable ${shell_classes.pill_clickable}`} style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className={`pill-label ${shell_classes.pill_label}`}>Sign up</span><ExternalIcon />
        </a>
        <a href="https://mypayindia.com/" target="_blank" rel="noopener noreferrer"
          className={`pill clickable ${shell_classes.pill_clickable}`} style={{ textDecoration: 'none', color: 'inherit', gap: '6px' }}>
          <span className={`pill-label ${shell_classes.pill_label}`}>Home</span><ExternalIcon />
        </a>
      </>
    );
  }

  const canAdd = accounts.length < maxAccounts;
  const isOnlyAccount = accounts.length === 1;

  return (
    <>
      <div className={`acct-dropdown ${shell_classes.acct_dropdown}`} ref={ref}>
        <button
          className={`pill clickable ${shell_classes.pill_clickable}`}
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
          <span className={`pill-label ${shell_classes.pill_label}`}>Logged in as</span>
          <strong><DisplayName account={active} mode={settings.displayName} /></strong>
          <span className={`acct-chevron ${open && !closing ? `acct-chevron-open ${shell_classes.acct_chevron_open}` : shell_classes.acct_chevron}`}><ChevronDown /></span>
        </button>

        {(open || closing) && (
          <div
            className={`acct-dropdown-menu ${closing ? `acct-dropdown-closing ${shell_classes.acct_dropdown_closing}` : shell_classes.acct_dropdown_menu}`}
            role="menu"
            onAnimationEnd={() => { if (closing) { setClosing(false); setOpen(false); set_hovered_account_id(null); } }}
          >
            <div className={`acct-list ${shell_classes.acct_list}`}>
              {accounts.map((acc) => {
                const isActive = acc.id === active.id;
                const balance = formatBalance(acc.lastBalance);
                const show_check = isActive && hovered_account_id !== acc.id;
                return (
                  <div key={acc.id} className={`acct-item ${isActive ? `active ${shell_classes.acct_item_active}` : shell_classes.acct_item}`} onMouseEnter={() => set_hovered_account_id(acc.id)} onMouseLeave={() => set_hovered_account_id(null)}>
                    <button
                      className={`acct-switch-btn ${shell_classes.acct_switch_btn}`}
                      data-account-id={acc.id}
                      disabled={switching}
                      onClick={() => selectAccount(acc.id)}
                    >
                      <span className={`acct-info ${shell_classes.acct_info}`}>
                        <span className={`acct-name ${shell_classes.acct_name}`}>
                          {acc.firstName || acc.lastName
                            ? <>{`${acc.firstName || ''} ${acc.lastName || ''}`.trim()}<span className={`acct-handle ${shell_classes.acct_handle}`}> @{acc.username}</span></>
                            : acc.username}
                        </span>
                        <span className={`acct-meta ${shell_classes.acct_meta}`}>
                          {acc.role && <span className={`acct-badge ${shell_classes.acct_badge}`}>{acc.role}</span>}
                          {acc.env === 'staging' && <span className={`acct-badge acct-badge-staging ${shell_classes.acct_badge_staging}`}>staging</span>}
                          {balance && <span className={`acct-balance ${shell_classes.acct_balance}`}>{balance}</span>}
                        </span>
                      </span>
                    </button>
                    <button
                      className={`acct-remove ${isActive ? `acct-remove-active ${shell_classes.acct_remove_active}` : shell_classes.acct_remove}`}
                      data-account-id={acc.id}
                      onClick={() => requestRemoveAccount(acc.id)}
                      aria-label={isOnlyAccount ? 'Log out' : `Remove ${acc.username}`}
                      title={isOnlyAccount ? 'Log out' : 'Remove this account'}
                    >
                      {isOnlyAccount ? <LogoutIcon size={13} /> : (
                        <>
                          <span className={`acct-icon-check ${show_check ? shell_classes.acct_icon_visible : shell_classes.acct_icon_hidden}`}><CheckIcon size={13} /></span>
                          <span className={`acct-icon-x ${show_check ? shell_classes.acct_icon_hidden : shell_classes.acct_icon_visible}`}><CloseIcon size={13} /></span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <div className={`acct-footer ${shell_classes.acct_footer}`}>
              {canAdd ? (
                <Link to="/login" data-drag-route="/login" className={`acct-add-btn ${shell_classes.acct_add_btn}`} onClick={closeDropdown}>
                  <PlusIcon size={13} /> Add an account
                </Link>
              ) : (
                <span className={`acct-add-btn ${shell_classes.acct_add_btn}`} style={{ color: 'var(--muted)', cursor: 'default' }}>
                  Account limit at capacity ({maxAccounts})
                </span>
              )}
              <Link to="/logout" data-drag-route="/logout" className={`acct-add-btn ${shell_classes.acct_add_btn}`} onClick={closeDropdown}>
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
