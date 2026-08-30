import { corsJson, defineFlowTask, flowError, flowToken, text } from "./shared.js";

function loginFormSubtask(showTotp, errorMessage) {
  return {
    subtask_id: showTotp ? "LoginEnterTotp" : "LoginEnterCredentials",
    type: "login_form",
    login_form: {
      primary_text: text("Log in to MyPayIndia"),
      page_title: "Log in to MyPayIndia",
      fields: {
        username: {
          label: "Username or email",
          type: "text",
          autocomplete: "username",
          required: true
        },
        password: {
          label: "Password",
          type: "password",
          autocomplete: "current-password",
          required: true,
          show_label: "Show password",
          hide_label: "Hide password"
        },
        totp: {
          label: "Two-factor code",
          type: "text",
          autocomplete: "one-time-code",
          input_mode: "numeric",
          pattern: "[0-9]*"
        }
      },
      show_totp: showTotp,
      advanced: {
        summary: "Advanced",
        prefill_totp_label: "Enter 2FA code prematurely"
      },
      ...(errorMessage ? { error_text: text(errorMessage) } : {}),
      actions: [
        {
          link_type: "task",
          link_id: "next",
          label: "Log in",
          pending_label: "Logging in...",
          staging_pending_label: "Logging into staging..."
        },
        {
          link_type: "external",
          link_id: "signup",
          label: "Sign up on the main website",
          url: "https://mypayindia.com/auth/register"
        },
        {
          link_type: "abort",
          link_id: "cancel",
          label: "Nevermind, go back",
          at_capacity_label: "Go back and remove an account"
        }
      ]
    },
    subtask_back_navigation: "hide_explicit_cta"
  };
}

function loginTaskResponse(token, subtask, corsOrigin, upstreamHeaders) {
  return corsJson({
    success: true,
    data: {
      flow_token: token,
      status: "success",
      presentation: {
        kind: "modal",
        animation: "slide",
        close_behavior: "return_or_dash"
      },
      subtasks: [subtask]
    }
  }, 200, corsOrigin, upstreamHeaders);
}

export default defineFlowTask({
  name: "login",

  match(task) {
    return task === "login" ? {} : null;
  },

  get({ corsOrigin }) {
    return loginTaskResponse(flowToken("login."), loginFormSubtask(false), corsOrigin);
  },

  matchesFlowToken(token) {
    return typeof token === "string" && token.startsWith("login.");
  },

  async continue({ body, backendBase, corsOrigin }) {
    const token = typeof body?.flow_token === "string" ? body.flow_token : "";
    if (!/^login\.[a-f0-9]{32}$/.test(token)) {
      return flowError("invalid_flow_token", "The login flow has expired or is invalid", 400, corsOrigin);
    }

    const input = Array.isArray(body?.subtask_inputs) ? body.subtask_inputs[0] : null;
    if (
      !input ||
      (input.subtask_id !== "LoginEnterCredentials" && input.subtask_id !== "LoginEnterTotp") ||
      input.action_id !== "next"
    ) {
      return flowError("invalid_subtask_input", "The login subtask input is invalid", 400, corsOrigin);
    }

    const values = input.values && typeof input.values === "object" ? input.values : {};
    const username = typeof values.username === "string" ? values.username.trim() : "";
    const password = typeof values.password === "string" ? values.password : "";
    const totpCode = typeof values.totp_code === "string" ? values.totp_code.trim() : "";
    if (!username || !password) {
      return loginTaskResponse(token, loginFormSubtask(
        input.subtask_id === "LoginEnterTotp",
        "Enter your username and password to continue"
      ), corsOrigin);
    }

    let upstream;
    try {
      upstream = await fetch(new URL("/api/v2/auth/login", backendBase), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password,
          ...(totpCode ? { totp_code: totpCode } : {})
        }),
        redirect: "manual"
      });
    } catch (error) {
      return flowError(
        "upstream_unavailable",
        error instanceof Error ? error.message : "The login service is unavailable",
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
        `The login service returned non-JSON (HTTP ${upstream.status})`,
        502,
        corsOrigin
      );
    }

    if (!upstream.ok || payload?.success !== true) {
      const code = Number(payload?.error);
      const showTotp = code === 1002 || code === 1010 || input.subtask_id === "LoginEnterTotp";
      const message = code === 1002
        ? "Please enter the 2FA code from your authenticator app"
        : code === 1010
          ? "Incorrect 2FA code"
          : payload?.message ?? "Could not authenticate you";
      return loginTaskResponse(token, loginFormSubtask(showTotp, message), corsOrigin);
    }

    const user = payload.data?.user;
    const sessionId = payload.data?.session_id;
    if (!user || typeof user !== "object" || !sessionId) {
      return flowError(
        "invalid_upstream_response",
        "The login service returned an invalid session",
        502,
        corsOrigin
      );
    }

    return loginTaskResponse(token, {
      subtask_id: "LoginSuccess",
      type: "login_success",
      login_success: {
        user,
        session_id: String(sessionId)
      },
      subtask_back_navigation: "hide_explicit_cta"
    }, corsOrigin, upstream.headers);
  }
});
