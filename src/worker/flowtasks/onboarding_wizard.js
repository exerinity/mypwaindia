import { corsJson, defineFlowTask, flowToken, text } from "./shared.js";

const ROUTE_OPTIONS = [
  { value: "/dash", label: "Dashboard" },
  { value: "/account", label: "Account" },
  { value: "/i/agent", label: "Agent" },
  { value: "/account/transfer", label: "Transfer funds" },
  { value: "/account/history", label: "Full transaction history" },
  { value: "/account/history/simple", label: "Simple history" },
  { value: "/account/restrictions", label: "Active restrictions" },
  { value: "/dash/statements", label: "Statements" },
  { value: "/dash/cards", label: "Cards" },
  { value: "/account/links", label: "Payment links" },
  { value: "/settings/appearance", label: "Settings" },
  { value: "/i/leaderboard", label: "Leaderboard" },
  { value: "/i/team", label: "Meet the team" },
  { value: "/i/release_notes", label: "App release notes" },
  { value: "/i/acknowledgements", label: "Acknowledgements" },
  { value: "/i/command", label: "MyCLiIndia" },
  { value: "/iotm", label: "Investment Opportunities™" },
  { value: "/iotm/button", label: "The Button" }
];

export default defineFlowTask({
  name: "onboarding_wizard",
  abortActions: { OnboardingWizard: ["complete"] },

  match(task) {
    return task === "onboarding/wizard" || task === "onboarding_wizard" ? {} : null;
  },

  get({ corsOrigin }) {
    return corsJson({
      success: true,
      data: {
        flow_token: flowToken("onboarding_wizard."),
        status: "success",
        presentation: {
          kind: "modal",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "OnboardingWizard",
            type: "onboarding_wizard",
            onboarding_wizard: {
              steps: [
                {
                  step_id: "Theme",
                  type: "theme_picker",
                  progress_label: "Theme",
                  primary_text: text("Pick a theme"),
                  secondary_text: text("You can create a custom theme later in Settings"),
                  theme_options: [
                    { value: "light", label: "Light" },
                    { value: "dim", label: "Dim" },
                    { value: "dark", label: "Dark" }
                  ],
                  accent_label: "Accent color",
                  accent_placeholder: "#d03505"
                },
                {
                  step_id: "SpeedDial",
                  type: "speed_dial",
                  progress_label: "Speed dial",
                  primary_text: text("Speed dial"),
                  secondary_text: text("Choose up to 5 quick-action buttons for your dashboard"),
                  max_buttons: 5,
                  route_options: ROUTE_OPTIONS,
                  style_options: [
                    { value: "primary", label: "Primary" },
                    { value: "secondary", label: "Secondary" },
                    { value: "danger", label: "Danger" }
                  ],
                  default_buttons: [
                    { route: "/account/transfer", style: "primary" },
                    { route: "/account/links", style: "secondary" },
                    { route: "/account/history", style: "secondary" }
                  ],
                  add_label: "Add button",
                  reset_label: "Reset to defaults",
                  style_label: "Button style",
                  remove_label: "Remove button"
                },
                {
                  step_id: "DefaultPage",
                  type: "default_page",
                  progress_label: "Default page",
                  primary_text: text("Default page"),
                  secondary_text: text("What should load when you open the app?"),
                  route_options: ROUTE_OPTIONS
                },
                {
                  step_id: "Updates",
                  type: "boolean_setting",
                  progress_label: "Updates",
                  primary_text: text("Updates"),
                  secondary_text: text("Should the app update itself when a new version is available?"),
                  setting: "autoUpdate",
                  label: "Yeah"
                },
                {
                  step_id: "Syncing",
                  type: "boolean_setting",
                  progress_label: "Syncing",
                  primary_text: text("Syncing"),
                  secondary_text: text("Keep your data fresh in the background?"),
                  setting: "autoRefresh",
                  label: "Auto-refresh data (every 30 seconds)"
                }
              ],
              navigation: {
                back_label: "Back",
                next_label: "Next",
                finish_label: "Finish"
              },
              completion: {
                primary_text: text("Setup finished"),
                secondary_text: text("MyPWAIndia is now yours. Enjoy!"),
                action: {
                  link_type: "abort",
                  link_id: "complete",
                  label: "OK let me in already"
                }
              }
            },
            subtask_back_navigation: "hide_explicit_cta"
          }
        ]
      }
    }, 200, corsOrigin);
  }
});
