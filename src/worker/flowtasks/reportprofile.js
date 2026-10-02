import { defineFlowTask, flowError, flowToken, text, request_flow_api, flow_response } from "./shared.js";

const reasons = ["scam", "impersonation", "inappropriate", "spam", "other"];

export default defineFlowTask({
  name: "reportprofile",
  abortActions: { ReportProfile: ["cancel"] },

  match(task) {
    return task === "reportprofile" ? {} : null;
  },

  async get(context) {
    const { url, corsOrigin: cors_origin } = context;
    const username = (url.searchParams.get("username") ?? "").trim();
    if (!username) return flowError(9004, "A valid username is required", 400, cors_origin);
    const result = await request_flow_api(context, "/api/v2/profile/me");
    if (result.error) return result.error;
    if (typeof result.data.username !== "string") return flowError("invalid_upstream_response", "The profile service returned invalid data", 502, cors_origin);
    if (result.data.username.toLowerCase() === username.toLowerCase()) return flowError(9004, "You cannot report your own profile", 400, cors_origin);
    return flow_response(flowToken("reportprofile."), [{
      subtask_id: "ReportProfile",
      type: "profile_report",
      profile_report: {
        primary_text: text(`Report @${username}`),
        success_text: text("Report sent. Thank you!"),
        username,
        labels: { reason: "Reason", details: "Details (optional)", required_details: "Details (required)" },
        reasons: reasons.map((value) => ({ value, label: value })),
        actions: [
          { link_type: "task", link_id: "submit", label: "Send report", pending_label: "Sending..." },
          { link_type: "abort", link_id: "cancel", label: "Cancel" }
        ]
      },
      subtask_back_navigation: "hide_explicit_cta"
    }], cors_origin, result.headers);
  },

  async continue(context) {
    const { body, corsOrigin: cors_origin } = context;
    const input = body.subtask_inputs?.[0];
    const values = input?.values;
    if (input?.subtask_id !== "ReportProfile" || input.action_id !== "submit" || !values || typeof values !== "object" || Array.isArray(values)) {
      return flowError("invalid_subtask_input", "The report input is invalid", 400, cors_origin);
    }
    const username = typeof values.username === "string" ? values.username.trim() : "";
    const details = typeof values.details === "string" ? values.details.trim() : "";
    if (!username || !reasons.includes(values.reason) || (values.reason === "other" && !details)) {
      return flowError(9004, "Enter a valid report reason and details", 400, cors_origin);
    }
    const result = await request_flow_api(context, "/api/v2/profile/report", {
      method: "POST", body: { username, reason: values.reason, ...(details ? { details } : {}) }
    });
    if (result.error) return result.error;
    return flow_response(body.flow_token, [], cors_origin, result.headers);
  }
});
