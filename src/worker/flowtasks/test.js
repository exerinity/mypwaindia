import { corsJson, defineFlowTask, flowToken, text } from "./shared.js";

async function getIdentity(req, backendBase) {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return {
      auth_state: "signed_out",
      logged_in_as: null,
      identity_error: null
    };
  }

  let upstream;
  try {
    upstream = await fetch(new URL("/api/v2/user/info", backendBase), {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "Authorization": authorization
      },
      redirect: "manual"
    });
  } catch (error) {
    return {
      auth_state: "lookup_failed",
      logged_in_as: null,
      identity_error: error instanceof Error ? error.message : String(error)
    };
  }

  let payload;
  try {
    payload = await upstream.json();
  } catch (_) {
    return {
      auth_state: "lookup_failed",
      logged_in_as: null,
      identity_error: `non-JSON response (HTTP ${upstream.status})`
    };
  }

  if (!upstream.ok || payload?.success !== true || !payload.data?.username) {
    return {
      auth_state: "lookup_failed",
      logged_in_as: null,
      identity_error: payload?.message ?? `HTTP ${upstream.status}`
    };
  }

  return {
    auth_state: "logged_in",
    logged_in_as: {
      id: payload.data.id ?? null,
      username: payload.data.username,
      role: payload.data.role ?? null
    },
    identity_error: null
  };
}

export default defineFlowTask({
  name: "test",

  abortActions: {
    FlowTest: ["test_abort"]
  },

  match(task) {
    return task === "test" ? {} : null;
  },

  async get({ req, backendBase, corsOrigin }) {
    const identity = await getIdentity(req, backendBase);
    const flowId = flowToken("test.");

    return corsJson({
      success: true,
      data: {
        flow_token: flowId,
        status: "success",
        presentation: {
          kind: "modal",
          animation: "slide",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "FlowTest",
            type: "flow_test",
            flow_test: {
              flow_id: flowId,
              rendered_at: new Date().toISOString(),
              ...identity,
              primary_text: text("Flow test"),
              secondary_text: text("no_op"),
              text_samples: [
                { label: "plain_text", value: text("FlowText") },
                {
                  label: "text_with_entities",
                  value: {
                    text: "@mypayindia",
                    entities: [{ from_index: 0, to_index: 11, type: "mention" }]
                  }
                }
              ],
              options: [
                { value: "first", label: "first" },
                { value: "second", label: "second" },
                { value: "third", label: "third" }
              ],
              flags: {
                enabled: true,
                disabled: false,
                nullable: null
              },
              inputs: [
                { input_id: "text", type: "text", label: "text", value: "text", placeholder: "text" },
                { input_id: "email", type: "email", label: "email", value: "e@mypayindia.com", placeholder: "email" },
                { input_id: "password", type: "password", label: "password", value: "password", placeholder: "password" },
                { input_id: "number", type: "number", label: "number", value: "123", placeholder: "number" },
                { input_id: "url", type: "url", label: "url", value: "https://mypayindia.com/", placeholder: "url" },
                { input_id: "search", type: "search", label: "search", value: "search", placeholder: "search" },
                { input_id: "color", type: "color", label: "color", value: "#5b6cff" },
                { input_id: "required", type: "text", label: "required", value: "", placeholder: "required", required: true },
                { input_id: "read_only", type: "text", label: "read_only", value: "read_only", read_only: true },
                { input_id: "disabled", type: "text", label: "disabled", value: "disabled", disabled: true }
              ],
              textarea: {
                input_id: "textarea",
                label: "textarea",
                value: "textarea",
                placeholder: "textarea"
              },
              select: {
                input_id: "select",
                label: "select",
                value: "second",
                options: [
                  { value: "first", label: "first" },
                  { value: "second", label: "second" },
                  { value: "third", label: "third" }
                ]
              },
              checkboxes: [
                { input_id: "checkbox_checked", label: "checked", checked: true },
                { input_id: "checkbox_unchecked", label: "unchecked", checked: false },
                { input_id: "checkbox_disabled", label: "disabled", checked: true, disabled: true }
              ],
              toggles: [
                { input_id: "toggle_checked", label: "checked", checked: true },
                { input_id: "toggle_unchecked", label: "unchecked", checked: false },
                { input_id: "toggle_disabled", label: "disabled", checked: true, disabled: true }
              ],
              buttons: [
                { button_id: "primary", label: "primary", style: "primary" },
                { button_id: "secondary", label: "secondary", style: "secondary" },
                { button_id: "danger", label: "danger", style: "danger" },
                { button_id: "ghost", label: "ghost", style: "ghost" },
                { button_id: "compact", label: "compact", style: "compact" },
                { button_id: "disabled", label: "disabled", style: "primary", disabled: true },
                { button_id: "option", label: "option", description: "option_desc", style: "option" }
              ],
              actions: [
                {
                  link_type: "navigate",
                  link_id: "test_navigate",
                  label: "navigate",
                  url: "/dash"
                },
                {
                  link_type: "client_action",
                  link_id: "test_client_action",
                  label: "action"
                },
                {
                  link_type: "abort",
                  link_id: "test_abort",
                  label: "abort"
                },
                {
                  link_type: "external",
                  link_id: "test_external",
                  label: "external",
                  url: "https://mypayindia.com/"
                },
                {
                  link_type: "task",
                  link_id: "test_task",
                  label: "task",
                  logged_out_label: "logged_out",
                  pending_label: "pending",
                  staging_pending_label: "staging_pending",
                  at_capacity_label: "at_capacity"
                }
              ]
            },
            subtask_back_navigation: "hide_explicit_cta"
          }
        ]
      }
    }, 200, corsOrigin);
  },

  continue({ body, corsOrigin }) {
    const input = Array.isArray(body?.subtask_inputs) ? body.subtask_inputs[0] : null;
    if (input?.subtask_id !== "FlowTest" || input?.action_id !== "test_task") {
      return corsJson({
        success: false,
        error: "invalid_subtask_input",
        message: "invalid_subtask_input"
      }, 400, corsOrigin);
    }

    return corsJson({
      success: true,
      data: {
        flow_token: body.flow_token,
        status: "success",
        presentation: {
          kind: "modal",
          animation: "slide",
          close_behavior: "return_or_dash"
        },
        subtasks: []
      }
    }, 200, corsOrigin);
  }
});
