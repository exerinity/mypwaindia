import { continueFlowTask, runFlowTask } from "./flowtasks/index.js";
import { flowError } from "./flowtasks/shared.js";

export const FLOW_TASK_PATH = "/api/pwa/flow/task";

async function readFlowInput(req, corsOrigin) {
  let raw;
  try {
    raw = await req.text();
  } catch (_) {
    return {
      error: flowError("invalid_request", "Could not read the flow", 400, corsOrigin)
    };
  }

  if (raw.length > 64 * 1024) {
    return {
      error: flowError("invalid_request", "The flow input is too large", 413, corsOrigin)
    };
  }

  try {
    return { body: JSON.parse(raw) };
  } catch (_) {
    return {
      error: flowError("invalid_request", "The flow input is not valid JSON", 400, corsOrigin)
    };
  }
}

export async function handleFlowTask(req, backendBase, corsOrigin) {
  const url = new URL(req.url);
  const context = { req, url, backendBase, corsOrigin };

  if (req.method === "POST") {
    const input = await readFlowInput(req, corsOrigin);
    return input.error ?? continueFlowTask(input.body, context);
  }

  if (req.method !== "GET") {
    return flowError("method_not_allowed", "Method not allowed", 405, corsOrigin);
  }

  const taskName = (url.searchParams.get("flow_name") || "").replace(/^\/+|\/+$/g, "");
  return runFlowTask(taskName, context);
}
