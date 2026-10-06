import { utility_classes } from '../../styles/utils.stylex.ts';
import { table_classes } from '../../styles/tables.stylex.ts';
import { link_classes } from '../../styles/links.stylex.ts';
import { button_classes } from '../../styles/buttons.stylex.ts';
import { app_lock_classes } from '../../styles/app_lock.stylex.ts';
import { form_classes } from '../../styles/forms.stylex.ts';
import React, { useState, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Account } from '../../context/auth_ctx.tsx';
import { useAuth } from '../../context/auth_ctx.tsx';
import { useSettings } from '../../context/settings_ctx.tsx';
import { useToast } from '../../context/toast_ctx.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { SettingsIcon } from '../../components/ui/icons.tsx';
import { hideGet, hideSetValue, hideClear } from '../../utils/storage.ts';

const ConfirmModal = lazy(() => import('../../components/ui/confirm_modal.tsx').then((m) => ({ default: m.ConfirmModal })));
const AddAccountModal = lazy(() => import('../../components/account/add_acc_modal.tsx').then((m) => ({ default: m.AddAccountModal })));

const HIDE_ROWS = [
  { key: 'install', label: 'Install app pill' },
  { key: 'sbshint', label: 'Path shortcut tip on dashboard' },
  { key: 'clickers', label: 'Active clickers dot (the button)' },
  { key: 'iotm_welcome', label: 'Welcome message (the button)' },
] as const;

type HideRowKey = typeof HIDE_ROWS[number]['key'];

const readHidden = () =>
  Object.fromEntries(HIDE_ROWS.map(({ key }) => [key, hideGet(key)])) as Record<HideRowKey, boolean>;

export function DataSettings() {
  const { settings, update, reset } = useSettings();
  const { accounts, removeAccount, switchAccount, active } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [addAccountOpen, setAddAccountOpen] = useState(false);
  const [removeOneTarget, setRemoveOneTarget] = useState<Account | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [hidden, setHidden] = useState(readHidden);

  const [deleteStorageConfirmOpen, setDeleteStorageConfirmOpen] = useState(false);
  const [deleteStorageDoneOpen, setDeleteStorageDoneOpen] = useState(false);
  return (
    <>
      <p className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>Manage your accounts, app data, and MyPayIndia account</p>
      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-2 ${utility_classes.mt_2}`}>Syncing</h3>
      <div className={`checkbox-row ${form_classes.checkbox_row}`}>
        <input
          type="checkbox"
          id="auto-refresh"
          checked={settings.autoRefresh}
          onChange={(e) => update({ autoRefresh: e.target.checked })}
          disabled={!active}
        />
        <label htmlFor="auto-refresh" style={{ margin: 0 }}>
          Auto-refresh data (every 30 seconds)
        </label>
      </div>
      <div className={`checkbox-row ${form_classes.checkbox_row}`} style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <input
          type="checkbox"
          id="auto-refresh-focused"
          checked={settings.autoRefreshOnlyWhenFocused}
          onChange={(e) => update({ autoRefreshOnlyWhenFocused: e.target.checked })}
          disabled={!active || !settings.autoRefresh}
        />
        <label htmlFor="auto-refresh-focused" style={{ margin: 0 }}>
          Only when focused
        </label>
      </div>
      <div className={`checkbox-row ${form_classes.checkbox_row}`} style={{ marginTop: '0.5rem' }}>
        <input
          type="checkbox"
          id="auto-update"
          checked={settings.autoUpdate}
          onChange={(e) => update({ autoUpdate: e.target.checked })}
        />
        <label htmlFor="auto-update" style={{ margin: 0 }}>
          Automatically update the app when a new version is available
        </label>
      </div>
      <div className={`checkbox-row ${form_classes.checkbox_row}`} style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
        <input
          type="checkbox"
          id="suppress-update-toast"
          checked={settings.suppressUpdateToast}
          onChange={(e) => update({ suppressUpdateToast: e.target.checked })}
        />
        <label htmlFor="suppress-update-toast" style={{ margin: 0 }}>
          Suppress "MyPWAIndia has been updated" toast
        </label>
      </div>
      <div className={`checkbox-row ${form_classes.checkbox_row}`} style={{ marginTop: '0.5rem' }}>
        <input
          type="checkbox"
          id="remember-info"
          checked={settings.rememberInfo}
          onChange={(e) => update({ rememberInfo: e.target.checked })}
        />
        <label htmlFor="remember-info" style={{ margin: 0 }}>
          Keep information (i.e. balance) in storage
        </label>
      </div>

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>Hide stuff</h3>
      <p style={{ fontSize: '0.9rem', marginBottom: 16, marginTop: 0 }}>
        If you pressed hide on something, you can unhide it here. Or hide everything in one go</p>
      {HIDE_ROWS.map(({ key, label }, i) => (
        <React.Fragment key={key}>
          {i > 0 && <hr style={{ margin: '0', border: 'none', borderTop: '1px solid var(--border)' }} />}
          <div className={`row spread ${utility_classes.spread} ${utility_classes.row}`} style={{ alignItems: 'center', padding: '10px 0' }}>
            <span style={{ fontSize: '0.9rem' }}>{label}</span>
            <label className={`toggle-switch ${form_classes.toggle_switch}`}>
              <input
                type="checkbox"
                checked={hidden[key]}
                onChange={(e) => { hideSetValue(key, e.target.checked); setHidden((h) => ({ ...h, [key]: e.target.checked })); }}
              />
              <span className={`toggle-track ${form_classes.toggle_track}`} />
            </label>
          </div>
        </React.Fragment>
      ))}

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h3 className={`mt-0 ${utility_classes.mt_0}`}>Saved accounts</h3>
      <div className={`row spread ${utility_classes.spread} ${utility_classes.row}`} style={{ marginBottom: 14, marginTop: 4 }}>
        <span className={`muted ${utility_classes.muted}`} style={{ fontSize: '0.9rem' }}>
          {accounts.length} saved
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="compact" onClick={() => setAddAccountOpen(true)}>
            Add account
          </button>
          {accounts.length > 0 && (
            <button className="compact danger" onClick={() => setRemoveAllOpen(true)}>
              Remove all
            </button>
          )}
        </div>
      </div>
      {accounts.length === 0 ? (
        <p className={`muted ${utility_classes.muted}`}>No accounts saved</p>
      ) : (
        <div className={`table-wrap ${table_classes.wrap}`}>
          <table className={`table ${table_classes.table}`}>
            <thead>
              <tr>
                <th>Who</th>
                <th>What</th>
                <th>Where</th>
                <th>Status</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => (
                <tr key={acc.id}>
                  <td>{acc.username}</td>
                  <td className={`muted ${utility_classes.muted}`}>{acc.role}</td>
                  <td className={`muted ${utility_classes.muted}`}>{acc.env ?? 'production'}</td>
                  <td>
                    {active?.id === acc.id
                      ? <span className={`link-status active ${link_classes.status_active}`}>current</span>
                      : (
                        <button
                          className="compact secondary"
                          disabled={switching}
                          onClick={async () => { setSwitching(true); await switchAccount(acc.id); }}
                        >
                          Switch to
                        </button>
                      )}
                  </td>
                  <td>
                    <button className="compact" disabled={switching} onClick={() => setRemoveOneTarget(acc)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <hr style={{ margin: '20px 0', borderColor: 'var(--border)' }} />
      <h2 className={`mt-0 ${utility_classes.mt_0}`}>App data</h2>
      <div className={`btn-row ${button_classes.row} ${utility_classes.row}`} style={{ marginTop: 4 }}>
        <button
          className="secondary"
          onClick={() => { reset(); hideClear(); setHidden(readHidden()); toast.info('Settings reset'); }}
        >
          Reset settings
        </button>
        <button
          className="secondary danger"
          onClick={() => setDeleteStorageConfirmOpen(true)}
        >
          Delete all storage
        </button>
      </div>

      <AddAccountModal open={addAccountOpen} onClose={() => setAddAccountOpen(false)} />

      <ConfirmModal
        open={!!removeOneTarget}
        onClose={() => setRemoveOneTarget(null)}
        onConfirm={() => { if (removeOneTarget) removeAccount(removeOneTarget.id); setRemoveOneTarget(null); }}
        title="Remove this account?"
        message={<>Are you sure you want to remove <strong>{removeOneTarget?.username || ''}</strong>?{accounts.length === 1 ? ' This is your only saved account, so you will be completely logged out of the app' : ' You will then be logged into the next available account'}</>}
        confirmLabel="Remove"
      />

      <ConfirmModal
        open={removeAllOpen}
        onClose={() => setRemoveAllOpen(false)}
        onConfirm={() => {
          accounts.map((a) => a.id).forEach((id) => removeAccount(id));
          setRemoveAllOpen(false);
          toast.info('All accounts cleared');
          navigate('/i/flow/login');
        }}
        title="Remove all accounts"
        message={`Do you really, really want to remove all ${accounts.length} saved account${accounts.length === 1 ? '' : 's'}?`}
        confirmLabel="Remove all (hold)"
        holdConfirm
      />

      <ConfirmModal
        open={deleteStorageConfirmOpen}
        onClose={() => setDeleteStorageConfirmOpen(false)}
        onConfirm={() => {
          localStorage.clear();
          setDeleteStorageConfirmOpen(false);
          setDeleteStorageDoneOpen(true);
        }}
        title="Delete all storage?"
        confirmLabel="Delete all"
        message={<>This will delete all local keys, including credentials, your chosen theme, and onboarding status. In other words, it will clear <strong>absolutely everything</strong>. Continue?</>}
      />

      <Modal
        open={deleteStorageDoneOpen}
        onClose={() => window.location.reload()}
        fullscreen
        bgIcon={<div className={`app-lock-bg-icon ${app_lock_classes.bg_icon}`}><SettingsIcon size={666} /></div>}
      >
        <p style={{ marginTop: 0 }}>All data has been wiped. MyPWAIndia will now reload</p>
        <div className={`btn-row ${button_classes.row} ${utility_classes.row}`}>
          <button onClick={() => window.location.reload()}>OK</button>
        </div>
      </Modal>
    </>
  );
}
