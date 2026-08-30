import linksInterstitial from "./links_interstitial.js";
import login from "./login.js";
import logout from "./logout.js";
import onboardingWizard from "./onboarding_wizard.js";
import transaction from "./transaction.js";
import { corsJson, flowError } from "./shared.js";

const FLOW_TASKS = [
  linksInterstitial,
  login,
  logout,
  onboardingWizard,
  transaction
];

export function runFlowTask(taskName, context) {
  for (const task of FLOW_TASKS) {
    const params = task.match(taskName);
    if (params !== null) return task.get({ ...context, params });
  }

  return flowError(
    "unknown_task",
    "That flow task doesn't exist",
    404,
    context.corsOrigin
  );
}

export function continueFlowTask(body, context) {
  const token = typeof body?.flow_token === "string" ? body.flow_token : "";
  const task = FLOW_TASKS.find(
    (candidate) => {
      const prefix = `${candidate.name}.`;
      return (
        (token.startsWith(prefix) && /^[a-f0-9]{32}$/.test(token.slice(prefix.length))) ||
        candidate.matchesFlowToken?.(token)
      );
    }
  );

  if (!task) {
    return flowError(
      "invalid_flow_token",
      "The flow has expired or is invalid",
      400,
      context.corsOrigin
    );
  }

  const input = Array.isArray(body?.subtask_inputs) ? body.subtask_inputs[0] : null;
  const abortActions = input ? task.abortActions?.[input.subtask_id] : null;
  if (abortActions?.includes(input.action_id)) {
    return corsJson({
      success: true,
      data: {
        flow_token: token,
        status: "success",
        subtasks: []
      }
    }, 200, context.corsOrigin);
  }

  if (task.continue) return task.continue({ ...context, body });

  return flowError(
    "invalid_subtask_input",
    "The flow subtask input is invalid",
    400,
    context.corsOrigin
  );
}
