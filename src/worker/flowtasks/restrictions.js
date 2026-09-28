import { getRestrictionInfo } from "../../utils/restrictions.js";
import { corsJson, defineFlowTask, flowError, flowToken, text } from "./shared.js";

export default defineFlowTask({
  name: "restrictions",
  abortActions: { AccountRestrictions: ["close"] },

  match(task) {
    return task === "restrictions" ? {} : null;
  },

  async get({ req, backendBase, corsOrigin }) {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return flowError(401, "Could not authenticate you", 401, corsOrigin);
    }

    let upstream;
    try {
      upstream = await fetch(new URL("/api/v2/user/restrictions", backendBase), {
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
        error instanceof Error ? error.message : "The restrictions service is unavailable",
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
        `The restrictions service returned non-JSON (HTTP ${upstream.status})`,
        502,
        corsOrigin
      );
    }

    if (!upstream.ok || payload?.success !== true) {
      return flowError(
        payload?.error ?? upstream.status,
        payload?.message ?? "No",
        upstream.ok ? 502 : upstream.status,
        corsOrigin
      );
    }

    const restrictions = payload.data?.restrictions;
    if (!restrictions || typeof restrictions !== "object" || Array.isArray(restrictions)) {
      return flowError(
        "invalid_upstream_response",
        "The restrictions service returned an invalid object",
        502,
        corsOrigin
      );
    }

    const activeRestrictions = Object.entries(restrictions)
      .filter(([, restriction]) => restriction?.active)
      .map(([key, restriction]) => {
        const info = getRestrictionInfo(key);
        return {
          restriction_id: key,
          primary_text: text(info.title),
          secondary_text: text(info.longDescription ?? info.description),
          expires_at: restriction.expires_at ?? null,
          value: restriction.value ?? null
        };
      });

    return corsJson({
      success: true,
      data: {
        flow_token: flowToken("restrictions."),
        status: "success",
        presentation: {
          kind: "modal",
          animation: "slide",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "AccountRestrictions",
            type: "account_restrictions",
            account_restrictions: {
              primary_text: text("Account restrictions"),
              empty_text: text("This account does not have any active restrictions"),
              labels: {
                expires: "Expires",
                no_expiration: "Has no expiration date"
              },
              restrictions: activeRestrictions,
              actions: [
                { link_type: "abort", link_id: "close", label: "OK" }
              ]
            },
            subtask_back_navigation: "hide_explicit_cta"
          }
        ]
      }
    }, 200, corsOrigin);
  }
});
