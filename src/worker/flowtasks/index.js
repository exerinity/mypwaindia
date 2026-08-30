import linksInterstitial from "./links_interstitial.js";
import login from "./login.js";
import logout from "./logout.js";
import onboardingWizard from "./onboarding_wizard.js";
import transaction from "./transaction.js";
import { flowError } from "./shared.js";

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
    (candidate) => candidate.continue && candidate.matchesFlowToken?.(token)
  );

  if (!task) {
    return flowError(
      "invalid_flow_token",
      "The flow has expired or is invalid",
      400,
      context.corsOrigin
    );
  }

  return task.continue({ ...context, body });
}
