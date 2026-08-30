import {
  corsJson,
  decodeTaskParameter,
  defineFlowTask,
  flowError,
  flowToken,
  text
} from "./shared.js";

export default defineFlowTask({
  name: "transaction",
  abortActions: { TransactionDetail: ["close"] },

  match(task) {
    if (task === "transaction") return {};
    if (!task.startsWith("transaction/")) return null;
    return { id: decodeTaskParameter(task.slice("transaction/".length)) };
  },

  async get({ req, url, backendBase, corsOrigin, params }) {
    const id = (params.id ?? url.searchParams.get("id") ?? "").trim();
    if (!id) {
      return flowError("missing_parameter", "A transaction ID is required", 400, corsOrigin);
    }
    if (id.length > 128) {
      return flowError("invalid_parameter", "That transaction ID is invalid", 400, corsOrigin);
    }

    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return flowError(401, "Could not authenticate you", 401, corsOrigin);
    }

    const upstreamUrl = new URL("/api/v2/transaction/get", backendBase);
    upstreamUrl.searchParams.set("id", id);
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
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
        error instanceof Error ? error.message : "The transaction service is unavailable",
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
        `The transaction service returned non-JSON (HTTP ${upstream.status})`,
        502,
        corsOrigin
      );
    }

    if (!upstream.ok || payload?.success !== true) {
      return flowError(
        payload?.error ?? upstream.status,
        payload?.message ?? "Could not retrieve the transaction",
        upstream.status || 502,
        corsOrigin
      );
    }

    const transaction = payload.data;
    if (!transaction || typeof transaction !== "object") {
      return flowError(
        "invalid_upstream_response",
        "The transaction service returned an invalid object",
        502,
        corsOrigin
      );
    }

    const sender = transaction.sender?.username ?? "?";
    const recipient = transaction.recipient?.username ?? "?";
    const numericId = transaction.id ?? id;
    const transactionId = transaction.transaction_id ?? id;

    return corsJson({
      success: true,
      data: {
        flow_token: flowToken("transaction."),
        status: "success",
        presentation: {
          kind: "modal",
          animation: "slide",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "TransactionDetail",
            type: "transaction_detail",
            transaction_detail: {
              primary_text: text("Transaction"),
              incoming_title: text(`Transaction from @${sender}`),
              outgoing_title: text(`Transaction to @${recipient}`),
              labels: {
                amount: "Amount",
                from: "From",
                when: "When",
                to: "To",
                id: "ID",
                deeplinks: "Deeplinks",
                transaction_id: "Transaction ID",
                note: "Note"
              },
              transaction,
              deeplinks: [
                {
                  label: "MyPayIndia",
                  url: `https://mypayindia.com/account/transfers/${encodeURIComponent(String(numericId))}`
                },
                {
                  label: "MyPWAIndia",
                  url: `https://mypayindia.sbs/i/flow/transaction/${encodeURIComponent(String(transactionId))}`
                }
              ],
              actions: [
                {
                  link_type: "navigate",
                  link_id: "new_transfer",
                  label: "New transfer"
                },
                {
                  link_type: "client_action",
                  link_id: "return_transfer",
                  label: "Return it"
                },
                {
                  link_type: "abort",
                  link_id: "close",
                  label: "OK"
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
