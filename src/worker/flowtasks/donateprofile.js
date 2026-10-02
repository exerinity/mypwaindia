import { defineFlowTask, flowError, flowToken, text, request_flow_api, flow_response } from "./shared.js";

function donation_subtask(username, result = null) {
  return {
    subtask_id: "DonateProfile",
    type: "profile_donation",
    profile_donation: {
      primary_text: text(`Donate to @${username}`), username, minimum: 100, message_limit: 200, result,
      recipient_notice: text("The recipient will always see your donation. The checkbox above controls whether your name is shown publicly"),
      pending_text: text("Your donation is awaiting staff approval. It will count toward the profile's donation goal once confirmed"),
      confirmed_text: text("Your donation was confirmed! Thank you!"),
      labels: { amount: "Amount (INR)", message: "Message (optional)", public: "Show my name in supporters", review: "Review donation", confirm: "Confirm donation", back: "Back", done: "Done", transaction: "View transaction" },
      actions: [
        { link_type: "task", link_id: "donate", label: "Donate", pending_label: "Sending..." },
        { link_type: "abort", link_id: "cancel", label: "Cancel" }
      ]
    },
    subtask_back_navigation: "hide_explicit_cta"
  };
}

export default defineFlowTask({
  name: "donateprofile",
  abortActions: { DonateProfile: ["cancel"] },
  match(task) { return task === "donateprofile" ? {} : null; },
  async get(context) {
    const { url, corsOrigin: cors_origin } = context;
    const username = (url.searchParams.get("username") ?? "").trim();
    if (!username) return flowError(9004, "A valid username is required", 400, cors_origin);
    const owner = await request_flow_api(context, "/api/v2/profile/me");
    if (owner.error) return owner.error;
    if (typeof owner.data.username !== "string") return flowError("invalid_upstream_response", "The profile service returned invalid data", 502, cors_origin);
    if (owner.data.username.toLowerCase() === username.toLowerCase()) return flowError(2003, "You cannot donate to yourself!", 400, cors_origin);
    const profile = await request_flow_api(context, "/api/v2/profile/get", { query: { username } });
    if (profile.error) return profile.error;
    if (profile.data.private || profile.data.locked) return flowError(1014, "This profile cannot receive donations", 403, cors_origin);
    return flow_response(flowToken("donateprofile."), [donation_subtask(username)], cors_origin, profile.headers);
  },
  async continue(context) {
    const { body, corsOrigin: cors_origin } = context;
    const input = body.subtask_inputs?.[0];
    const values = input?.values;
    if (input?.subtask_id !== "DonateProfile" || input.action_id !== "donate" || !values || typeof values !== "object" || Array.isArray(values)) {
      return flowError("invalid_subtask_input", "The donation input is invalid", 400, cors_origin);
    }
    const username = typeof values.username === "string" ? values.username.trim() : "";
    const message = typeof values.message === "string" ? values.message : "";
    if (!username || !Number.isSafeInteger(values.amount) || values.amount < 100 || message.length > 200 || typeof values.public !== "boolean") {
      return flowError(9004, "Enter a valid donation of at least 1 INR and a message of at most 200 characters", 400, cors_origin);
    }
    const result = await request_flow_api(context, "/api/v2/profile/donate", {
      method: "POST", body: { username, amount: values.amount, public: values.public, ...(message ? { message } : {}) }
    });
    if (result.error) return result.error;
    return flow_response(body.flow_token, [donation_subtask(username, result.data)], cors_origin, result.headers);
  }
});
