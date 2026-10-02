import type { AuthOpts, Env } from './client.js';
import type { ShopItem, ShopOption } from './shop.js';
import type { ReportReason } from './profile.js';

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

export interface FlowTestInput {
  input_id: string;
  type: 'text' | 'email' | 'password' | 'number' | 'url' | 'search' | 'color';
  label: string;
  value: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  read_only?: boolean;
}

export interface FlowTestToggle {
  input_id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

export interface FlowTestButton {
  button_id: string;
  label: string;
  style: 'primary' | 'secondary' | 'danger' | 'ghost' | 'compact' | 'option';
  description?: string;
  disabled?: boolean;
}

export interface FlowTestSubtask {
  subtask_id: 'FlowTest';
  type: 'flow_test';
  flow_test: {
    flow_id: string;
    rendered_at: string;
    auth_state: 'logged_in' | 'signed_out' | 'lookup_failed';
    logged_in_as: { id: number | null; username: string; role: string | null } | null;
    identity_error: string | null;
    primary_text: FlowText;
    secondary_text: FlowText;
    text_samples: { label: string; value: FlowText }[];
    options: FlowOption[];
    flags: Record<string, boolean | null>;
    inputs: FlowTestInput[];
    textarea: {
      input_id: string;
      label: string;
      value: string;
      placeholder?: string;
      disabled?: boolean;
    };
    select: {
      input_id: string;
      label: string;
      value: string;
      options: FlowOption[];
      disabled?: boolean;
    };
    checkboxes: FlowTestToggle[];
    toggles: FlowTestToggle[];
    buttons: FlowTestButton[];
    actions: FlowAction<'test_task' | 'test_navigate' | 'test_client_action' | 'test_abort' | 'test_external'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface ImageSubtask {
  subtask_id: 'OpsecLevel';
  type: 'image';
  image: {
    image_name: string;
    url: string;
    alt: string;
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface AccountRestrictionsSubtask {
  subtask_id: 'AccountRestrictions';
  type: 'account_restrictions';
  account_restrictions: {
    primary_text: FlowText;
    empty_text: FlowText;
    labels: {
      expires: string;
      no_expiration: string;
    };
    restrictions: {
      restriction_id: string;
      primary_text: FlowText;
      secondary_text: FlowText;
      expires_at: string | null;
      value: unknown;
    }[];
    actions: FlowAction<'close'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface ShopItemEditorSubtask {
  subtask_id: 'EditShopItem';
  type: 'shop_item_editor';
  shop_item_editor: {
    primary_text: FlowText;
    success_text: FlowText;
    image_delivery_text: FlowText;
    item: ShopItem | null;
    labels: {
      name: string; description: string; price: string; stock: string; hidden: string; delivery: string;
      instant_type: string; instant_content: string; buyer_fields: string; option_label: string; option_type: string;
      required: string; extra_price: string; choice_label: string; remove_choice: string; add_choice: string; remove_field: string; add_field: string;
    };
    limits: { name: number; description: number };
    delivery_options: FlowOption<'manual' | 'instant'>[];
    instant_options: FlowOption<'text' | 'url'>[];
    option_types: FlowOption<ShopOption['type']>[];
    actions: FlowAction<'save' | 'cancel'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface ProfileReportSubtask {
  subtask_id: 'ReportProfile';
  type: 'profile_report';
  profile_report: {
    primary_text: FlowText;
    success_text: FlowText;
    username: string;
    labels: { reason: string; details: string; required_details: string };
    reasons: FlowOption<ReportReason>[];
    actions: FlowAction<'submit' | 'cancel'>[];
  };
  subtask_back_navigation: 'hide_explicit_cta';
}

export interface FlowTaskInput {
  subtask_id: string;
  action_id: string;
  values?: Record<string, unknown>;
}

export type FlowSubtask =
  | TransactionDetailSubtask
  | PaymentLinkInterstitialSubtask
  | OnboardingWizardSubtask
  | LoginFormSubtask
  | LoginSuccessSubtask
  | FlowTestSubtask
  | AccountRestrictionsSubtask
  | ShopItemEditorSubtask
  | ProfileReportSubtask
  | ImageSubtask;

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
  await submitFlowTaskAction(flowToken, input, auth);
}

export async function submitFlowTaskAction(
  flowToken: string,
  input: FlowTaskInput,
  auth?: AuthOpts
): Promise<FlowTaskResponse> {
  const { apiFetch } = await import('./client.js');
  return apiFetch('/api/pwa/flow/task', {
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
