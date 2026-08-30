import type { AuthOpts, Env } from './client.js';

export interface FlowText {
  text: string;
  entities: unknown[];
}

export interface FlowAction<ActionId extends string = string> {
  link_type: 'task' | 'navigate' | 'client_action' | 'abort' | 'external';
  link_id: ActionId;
  label: string;
  logged_out_label?: string;
  pending_label?: string;
  staging_pending_label?: string;
  at_capacity_label?: string;
  url?: string;
}

export interface FlowDeeplink {
  label: string;
  url: string;
}

export interface TransactionDetail {
  transaction_id: string;
  id: number;
  status: string;
  amount: number;
  created: string;
  note?: string;
  sender?: { username: string; id: number };
  recipient?: { username: string; id: number };
}

export interface TransactionDetailSubtask {
  subtask_id: 'TransactionDetail';
  type: 'transaction_detail';
  transaction_detail: {
    primary_text: FlowText;
    incoming_title: FlowText;
    outgoing_title: FlowText;
    labels: {
      amount: string;
      from: string;
      when: string;
      to: string;
      id: string;
      deeplinks: string;
      transaction_id: string;
      note: string;
    };
    transaction: TransactionDetail;
    deeplinks: FlowDeeplink[];
    actions: FlowAction<'new_transfer' | 'return_transfer' | 'close'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface PaymentLinkPreview {
  creator?: { username: string };
  amount: number;
  note?: string;
  created: string;
  status: string;
}

export interface PaymentLinkInterstitialSubtask {
  subtask_id: 'PaymentLinkInterstitial';
  type: 'payment_link_interstitial';
  payment_link_interstitial: {
    primary_text: FlowText;
    labels: {
      from: string;
      created: string;
      amount: string;
      note: string;
    };
    token: string;
    payment_link: PaymentLinkPreview;
    actions: FlowAction<'claim' | 'claim_external'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface LogoutConfirmationSubtask {
  subtask_id: 'LogoutConfirmation';
  type: 'logout_confirmation';
  logout_confirmation: {
    primary_text: FlowText;
    secondary_text: FlowText;
    next_account_text?: FlowText;
    actions: FlowAction<'cancel' | 'logout'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface FlowOption<Value extends string = string> {
  value: Value;
  label: string;
}

interface OnboardingStepBase {
  step_id: string;
  progress_label: string;
  primary_text: FlowText;
  secondary_text: FlowText;
}

export interface OnboardingThemeStep extends OnboardingStepBase {
  type: 'theme_picker';
  theme_options: FlowOption<'light' | 'dim' | 'dark'>[];
  accent_label: string;
  accent_placeholder: string;
}

export interface OnboardingSpeedDialStep extends OnboardingStepBase {
  type: 'speed_dial';
  max_buttons: number;
  route_options: FlowOption[];
  style_options: FlowOption<'primary' | 'secondary' | 'danger'>[];
  default_buttons: { route: string; style: 'primary' | 'secondary' | 'danger' }[];
  add_label: string;
  reset_label: string;
  style_label: string;
  remove_label: string;
}

export interface OnboardingDefaultPageStep extends OnboardingStepBase {
  type: 'default_page';
  route_options: FlowOption[];
}

export interface OnboardingBooleanSettingStep extends OnboardingStepBase {
  type: 'boolean_setting';
  setting: 'autoUpdate' | 'autoRefresh';
  label: string;
}

export type OnboardingWizardStep =
  | OnboardingThemeStep
  | OnboardingSpeedDialStep
  | OnboardingDefaultPageStep
  | OnboardingBooleanSettingStep;

export interface OnboardingWizardSubtask {
  subtask_id: 'OnboardingWizard';
  type: 'onboarding_wizard';
  onboarding_wizard: {
    steps: OnboardingWizardStep[];
    navigation: {
      back_label: string;
      next_label: string;
      finish_label: string;
    };
    completion: {
      primary_text: FlowText;
      secondary_text: FlowText;
      action: FlowAction<'complete'>;
    };
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface LoginField {
  label: string;
  type: 'text' | 'password';
  autocomplete: string;
  required?: boolean;
  input_mode?: 'numeric';
  pattern?: string;
  show_label?: string;
  hide_label?: string;
}

export interface LoginFormSubtask {
  subtask_id: 'LoginEnterCredentials' | 'LoginEnterTotp';
  type: 'login_form';
  login_form: {
    primary_text: FlowText;
    page_title: string;
    fields: {
      username: LoginField;
      password: LoginField;
      totp: LoginField;
    };
    show_totp: boolean;
    advanced: {
      summary: string;
      prefill_totp_label: string;
    };
    error_text?: FlowText;
    actions: FlowAction<'next' | 'signup' | 'cancel'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface LoginSuccessSubtask {
  subtask_id: 'LoginSuccess';
  type: 'login_success';
  login_success: {
    user: { id: number; username: string; role: string };
    session_id: string;
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export type FlowSubtask =
  | TransactionDetailSubtask
  | PaymentLinkInterstitialSubtask
  | LogoutConfirmationSubtask
  | OnboardingWizardSubtask
  | LoginFormSubtask
  | LoginSuccessSubtask;

export interface FlowTaskResponse {
  flow_token: string;
  status: 'success';
  presentation: {
    kind: 'modal';
    animation?: 'slide' | 'none';
    close_behavior: 'return_or_dash' | 'return_or_home';
  };
  subtasks: FlowSubtask[];
}

export async function getFlowTask(
  task: string,
  params: Record<string, string>,
  auth?: AuthOpts
): Promise<FlowTaskResponse> {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/pwa/flow/task', {
    token: auth?.token,
    env: auth?.env,
    query: { ...params, flow_name: task },
  });
}

export async function abortFlowTask(
  flowToken: string,
  input: { subtask_id: string; action_id: string },
  auth?: AuthOpts
): Promise<void> {
  const { apiFetch } = await import('./client.js');
  await apiFetch('/api/pwa/flow/task', {
    method: 'POST',
    token: auth?.token,
    env: auth?.env,
    body: {
      flow_token: flowToken,
      subtask_inputs: [input],
    },
  });
}

export async function continueLoginFlowTask(
  flowToken: string,
  input: {
    subtask_id: LoginFormSubtask['subtask_id'];
    action_id: 'next';
    values: {
      username: string;
      password: string;
      totp_code?: string;
    };
  },
  env: Env = 'production'
): Promise<FlowTaskResponse> {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/pwa/flow/task', {
    method: 'POST',
    env,
    body: {
      flow_token: flowToken,
      subtask_inputs: [input],
    },
  });
}

export async function getLeaderboard() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/info/leaderboard?limit=67');
}

export async function getTeam() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/v2/info/team');
}

export async function getNews() {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/pwa/meta/news');
}
