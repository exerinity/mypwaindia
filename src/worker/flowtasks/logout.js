import { corsJson, defineFlowTask, flowError, flowToken, text } from "./shared.js";

export default defineFlowTask({
  name: "logout",

  match(task) {
    return task === "logout" ? {} : null;
  },

  async get({ req, url, backendBase, corsOrigin }) {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return flowError(401, "Could not authenticate you", 401, corsOrigin);
    }

    const nextUsername = (url.searchParams.get("next_username") || "").trim();
    if (nextUsername.length > 128) {
      return flowError("invalid_parameter", "The next account is invalid", 400, corsOrigin);
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
      return flowError(
        "upstream_unavailable",
        error instanceof Error ? error.message : "The account service is unavailable",
        502,
        corsOrigin
      );
    }

    let payload;
    try {
      payload = await upstream.json();
    } catch (_) {
      return flowError(
        "invalid_upstream_response",
        `The account service returned non-JSON (HTTP ${upstream.status})`,
        502,
        corsOrigin
      );
    }

    if (!upstream.ok || payload?.success !== true) {
      return flowError(
        payload?.error ?? upstream.status,
        payload?.message ?? "Could not retrieve the active account",
        upstream.status || 502,
        corsOrigin
      );
    }

    const username = String(payload.data?.username || "").trim();
    if (!username) {
      return flowError(
        "invalid_upstream_response",
        "The account service returned an invalid account",
        502,
        corsOrigin
      );
    }

    const secondaryText = nextUsername
      ? "This will only apply to this account, and you'll still be logged in to your other accounts. You'll be switched to"
      : "You can always log back in at any time. If you just want to switch accounts, you can do that by adding an existing account.";

    return corsJson({
      success: true,
      data: {
        flow_token: flowToken(),
        status: "success",
        presentation: {
          kind: "modal",
          animation: "none",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "LogoutConfirmation",
            type: "logout_confirmation",
            logout_confirmation: {
              primary_text: text(`Log out of @${username}?`),
              secondary_text: text(secondaryText),
              ...(nextUsername ? { next_account_text: text(`@${nextUsername}`) } : {}),
              actions: [
                {
                  link_type: "abort",
                  link_id: "cancel",
                  label: "Cancel"
                },
                {
                  link_type: "client_action",
                  link_id: "logout",
                  label: "Log out",
                  pending_label: "Logging out..."
                }
              ]
            },
            subtask_back_navigation: "hide_explicit_cta"
          }
        ]
      }
    }, 200, corsOrigin);
  }
});
