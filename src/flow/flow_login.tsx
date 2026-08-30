import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import type { Env } from '../api/client.js';
import {
  continueLoginFlowTask,
  type LoginFormSubtask,
  type LoginSuccessSubtask,
} from '../api/flow.ts';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/auth_ctx.tsx';
import { useSettings } from '../context/settings_ctx.tsx';
import { useToast } from '../context/toast_ctx.tsx';
import { storageGet, KEYS } from '../utils/storage.ts';
import { usePageTitle } from '../hooks/page_title.js';
import { ArrowLeftIcon, ExternalIcon, WarningIcon, ErrorIcon, EyeIcon, EyeOffIcon } from '../components/ui/icons.tsx';
import { Modal } from '../components/ui/modal.tsx';
import { Skeleton, ErrorBox } from '../components/ui/status.tsx';
import Flowback from './shell_fallback.tsx';

const FloatingInput = lazy(() => import('../components/ui/floating_input.tsx').then((module) => ({ default: module.FloatingInput })));

interface LoginModalProps {
  subtask: LoginFormSubtask | null;
  flowToken: string | null;
  loading: boolean;
  error: unknown;
  embedded?: boolean;
  onClose?: () => void;
  onAbort?: (subtaskId: string, actionId: string) => void;
}

export default function LoginPage({ subtask, flowToken, loading, error: taskError, embedded = false, onClose, onAbort }: LoginModalProps) {
  const { completeLogin, accounts, maxAccounts } = useAuth();
  const { update: updateSettings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const [username, setUsername] = useState(searchParams.get('username') ?? '');
  const [password, setPassword] = useState(searchParams.get('password') ?? '');
  const [totp, setTotp] = useState('');
  const [prefill2fa, setPrefill2fa] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stagingLogin, setStagingLogin] = useState(false);
  const [continuedSubtask, setContinuedSubtask] = useState<LoginFormSubtask | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [missingTask, setMissingTask] = useState(false);
  const envRef = useRef<Env>(searchParams.get('env') === 'staging' ? 'staging' : 'production');
  const formRef = useRef<HTMLFormElement>(null);
  const autoSubmittedRef = useRef(false);
  const task = continuedSubtask ?? subtask;
  const form = task?.login_form;
  const nextAction = form?.actions.find((action) => action.link_id === 'next');
  const signupAction = form?.actions.find((action) => action.link_id === 'signup');
  const cancelAction = form?.actions.find((action) => action.link_id === 'cancel');
  const atCapacity = accounts.length >= maxAccounts;
  const bgLoc = (location.state as { backgroundLocation?: unknown } | null)?.backgroundLocation;

  usePageTitle(bgLoc ? null : (form?.page_title ?? 'Log in to MyPayIndia'));

  function handleClose() {
    if (onClose) {
      onClose();
      return;
    }
    if (bgLoc) navigate(-1);
    else navigate('/dash');
  }

  function handleCancel() {
    if (onAbort && task && cancelAction?.link_type === 'abort') {
      onAbort(task.subtask_id, cancelAction.link_id);
      return;
    }
    handleClose();
  }

  useEffect(() => {
    setContinuedSubtask(null);
    setClientError(null);
    setMissingTask(false);
    autoSubmittedRef.current = false;
  }, [flowToken]);

  useEffect(() => {
    if (
      flowToken &&
      task &&
      !autoSubmittedRef.current &&
      searchParams.get('username') &&
      searchParams.get('password') &&
      !searchParams.has('nologin')
    ) {
      autoSubmittedRef.current = true;
      formRef.current?.requestSubmit();
    }
  }, [flowToken, task, searchParams]);

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!flowToken || !task || !nextAction) return;
    if (atCapacity) {
      toast.error(`You have too many accounts logged in! (${maxAccounts} max)`);
      return;
    }

    const env = envRef.current;
    setStagingLogin(env === 'staging');
    const isScambait = searchParams.get('scambait') === 'true' || searchParams.get('s') === 'true';
    if (isScambait) updateSettings({ scambait: true, displayName: 'full_name' });
    setBusy(true);
    setClientError(null);

    try {
      const response = await continueLoginFlowTask(flowToken, {
        subtask_id: task.subtask_id,
        action_id: 'next',
        values: {
          username,
          password,
          ...(totp ? { totp_code: totp } : {}),
        },
      }, env);
      const nextSubtask = response.subtasks[0];

      if (nextSubtask?.type === 'login_form') {
        setContinuedSubtask(nextSubtask as LoginFormSubtask);
        return;
      }
      if (nextSubtask?.type !== 'login_success') {
        setMissingTask(true);
        return;
      }

      const success = nextSubtask as LoginSuccessSubtask;
      const goto = searchParams.get('goto');
      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } })?.from;
      const dest = goto ?? (from ? (from.pathname ?? '/dash') + (from.search ?? '') + (from.hash ?? '') : '/dash');
      const onboarded = storageGet<number>(KEYS.ONBOARD, 0) === 1;
      const claiming = dest.startsWith('/i/flow/links/interstitial/');
      completeLogin(
        { username, password, totp_code: totp || undefined, env },
        success.login_success,
        onboarded || isScambait || claiming ? dest : '/i/onboarding'
      );
    } catch (caught) {
      const { describeError } = await import('../utils/errors.js');
      setClientError(describeError(caught));
    } finally {
      setBusy(false);
      setStagingLogin(false);
    }
  }

  if (missingTask) return <Flowback embedded={embedded} onClose={handleClose} />;

  const content = (
    <>
      <Suspense fallback={null}>
        {loading && !form ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Skeleton width={220} height={26} />
            <Skeleton width="100%" height={52} />
            <Skeleton width="100%" height={52} />
            <Skeleton width="100%" height={42} radius={8} />
          </div>
        ) : taskError ? (
          <ErrorBox error={taskError} />
        ) : form && (
          <>
            <h2 className="mt-0">{form.primary_text.text}</h2>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && event.ctrlKey) {
                  event.preventDefault();
                  if (busy || atCapacity) return;
                  updateSettings({ scambait: true, displayName: 'full_name' });
                  event.currentTarget.requestSubmit();
                }
              }}
            >
              <FloatingInput
                label={form.fields.username.label}
                type={form.fields.username.type}
                autoComplete={form.fields.username.autocomplete}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required={form.fields.username.required}
                disabled={busy}
              />
              <FloatingInput
                label={form.fields.password.label}
                type={showPassword ? 'text' : form.fields.password.type}
                autoComplete={form.fields.password.autocomplete}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={form.fields.password.required}
                disabled={busy}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((showing) => !showing)}
                    aria-label={showPassword ? form.fields.password.hide_label : form.fields.password.show_label}
                    title={showPassword ? form.fields.password.hide_label : form.fields.password.show_label}
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                }
              />
              {(form.show_totp || prefill2fa) && (
                <FloatingInput
                  label={form.fields.totp.label}
                  type={form.fields.totp.type}
                  inputMode={form.fields.totp.input_mode}
                  pattern={form.fields.totp.pattern}
                  autoComplete={form.fields.totp.autocomplete}
                  value={totp}
                  onChange={(event) => setTotp(event.target.value)}
                  disabled={busy}
                />
              )}
              <details className="login-advanced" style={{ marginTop: '12px' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--muted)' }}>{form.advanced.summary}</summary>
                <div className="row spread" style={{ alignItems: 'center', marginTop: '12px' }}>
                  <div><strong>{form.advanced.prefill_totp_label}</strong></div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={prefill2fa}
                      onChange={(event) => setPrefill2fa(event.target.checked)}
                      disabled={busy}
                    />
                    <span className="toggle-track" />
                  </label>
                </div>
              </details>
              {atCapacity && (
                <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <WarningIcon /><span>Too many accounts are logged in ({maxAccounts})</span>
                </div>
              )}
              {(clientError || form.error_text) && (
                <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ErrorIcon /><span>{clientError ?? form.error_text?.text}</span>
                </div>
              )}
              {nextAction && (
                <button
                  type="submit"
                  title="TIP: right-click to log into the staging instance, Ctrl+Enter to immediately enable scambait mode when logging in"
                  disabled={busy || atCapacity}
                  style={{ width: '100%', marginTop: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    if (busy || atCapacity) return;
                    envRef.current = 'staging';
                    setStagingLogin(true);
                    event.currentTarget.form?.requestSubmit();
                  }}
                >
                  {busy
                    ? <><span className="spinner" /> {stagingLogin ? (nextAction.staging_pending_label ?? nextAction.pending_label) : nextAction.pending_label}</>
                    : nextAction.label}
                </button>
              )}
              {signupAction?.url && (
                <a
                  href={signupAction.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn secondary"
                  style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                >
                  {signupAction.label} <ExternalIcon />
                </a>
              )}
            </form>

            {cancelAction && (
              <div className="mt-2 center">
                <button
                  className="muted"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'inherit', font: 'inherit', padding: 0 }}
                  onClick={handleCancel}
                >
                  <ArrowLeftIcon /> {atCapacity ? (cancelAction.at_capacity_label ?? cancelAction.label) : cancelAction.label}
                </button>
              </div>
            )}
          </>
        )}
      </Suspense>
    </>
  );

  if (embedded) return content;
  return <Modal open onClose={handleClose} className="slide">{content}</Modal>;
}
