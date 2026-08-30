import {
  corsJson,
  decodeTaskParameter,
  defineFlowTask,
  flowError,
  flowToken,
  text
} from "./shared.js";

export default defineFlowTask({
  name: "links_interstitial",

  match(task) {
    if (task === "links_interstitial") return {};
    if (!task.startsWith("links/interstitial/")) return null;
    return { token: decodeTaskParameter(task.slice("links/interstitial/".length)) };
  },

  async get({ url, backendBase, corsOrigin, params }) {
    const token = (params.token ?? url.searchParams.get("token") ?? "").trim();
    if (!token) {
      return flowError("missing_parameter", "payment-link token is required", 400, corsOrigin);
    }
    if (token.length > 2048) {
      return flowError("invalid_parameter", "payment-link token is invalid", 400, corsOrigin);
    }

    const upstreamUrl = new URL("/api/v2/payment-link/get", backendBase);
    upstreamUrl.searchParams.set("token", token);
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: "GET",
        headers: { "Accept": "application/json" },
        redirect: "manual"
      });
    } catch (error) {
      return flowError(
        "upstream_unavailable",
        error instanceof Error ? error.message : "the payment-link service is unavailable",
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
        `the payment-link service returned non-JSON (HTTP ${upstream.status}).`,
        502,
        corsOrigin
      );
    }

    if (!upstream.ok || payload?.success !== true) {
      return flowError(
        payload?.error ?? upstream.status,
        payload?.message ?? "could not retrieve the payment link",
        upstream.status || 502,
        corsOrigin
      );
    }

    const paymentLink = payload.data;
    if (!paymentLink || typeof paymentLink !== "object") {
      return flowError(
        "invalid_upstream_response",
        "the payment-link service returned an invalid payment link",
        502,
        corsOrigin
      );
    }

    return corsJson({
      success: true,
      data: {
        flow_token: flowToken(),
        status: "success",
        presentation: {
          kind: "modal",
          close_behavior: "return_or_home"
        },
        subtasks: [
          {
            subtask_id: "PaymentLinkInterstitial",
            type: "payment_link_interstitial",
            payment_link_interstitial: {
              primary_text: text("Claim a payment link"),
              labels: {
                from: "From",
                created: "Created",
                amount: "Amount",
                note: "Note"
              },
              token,
              payment_link: paymentLink,
              actions: [
                {
                  link_type: "client_action",
                  link_id: "claim",
                  label: "Claim",
                  logged_out_label: "Log in to claim",
                  pending_label: "Claiming..."
                },
                {
                  link_type: "external",
                  link_id: "claim_external",
                  label: "Claim on MyPayIndia.com",
                  url: `https://mypayindia.com/pay/link?token=${encodeURIComponent(token)}`
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
