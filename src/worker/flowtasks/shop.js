import { defineFlowTask, flowError, flowToken, text, request_flow_api, flow_response } from "./shared.js";

function shop_subtask(item, order = null) {
  return {
    subtask_id: "ShopCheckout",
    type: "shop_checkout",
    shop_checkout: {
      primary_text: text(order ? "Your order" : item.name),
      item,
      order,
      actions: [
        { link_type: "task", link_id: "buy", label: "Pay", pending_label: "Purchasing..." },
        { link_type: "abort", link_id: "cancel", label: "Cancel" }
      ]
    },
    subtask_back_navigation: "hide_explicit_cta"
  };
}

export default defineFlowTask({
  name: "shop",
  abortActions: { ShopCheckout: ["cancel"] },

  match(task) {
    const match = /^shop\/(\d+)$/.exec(task);
    return match ? { item_id: match[1] } : null;
  },

  matchesFlowToken(token) {
    return /^shop\.[1-9]\d*\.[a-f0-9]{32}$/.test(token);
  },

  async get(context) {
    const { params, corsOrigin: cors_origin } = context;
    const item_id = Number(params.item_id);
    if (!Number.isSafeInteger(item_id) || item_id < 1) return flowError(9004, "The item ID is invalid", 400, cors_origin);
    const result = await request_flow_api(context, "/api/v2/shop/item", { query: { id: item_id }, auth_required: false });
    if (result.error) return result.error;
    if (result.data.id !== item_id || typeof result.data.name !== "string") return flowError("invalid_upstream_response", "The shop returned an invalid item", 502, cors_origin);
    return flow_response(flowToken(`shop.${item_id}.`), [shop_subtask(result.data)], cors_origin, result.headers);
  },

  async continue(context) {
    const { body, corsOrigin: cors_origin } = context;
    const input = body.subtask_inputs?.[0];
    const values = input?.values;
    if (input?.subtask_id !== "ShopCheckout" || input.action_id !== "buy" || !values || typeof values !== "object" || Array.isArray(values)) {
      return flowError("invalid_subtask_input", "The purchase input is invalid", 400, cors_origin);
    }
    const { item_id, quantity, options, amount, discount_code, gift_to } = values;
    const token_item_id = Number(/^shop\.([1-9]\d*)\.[a-f0-9]{32}$/.exec(body.flow_token)?.[1]);
    if (!Number.isSafeInteger(item_id) || item_id < 1 || item_id !== token_item_id || !Number.isSafeInteger(quantity) || quantity < 1 || !options || typeof options !== "object" || Array.isArray(options) ||
      Object.values(options).some((value) => !["string", "number", "boolean"].includes(typeof value)) ||
      (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 0)) ||
      (discount_code !== undefined && (typeof discount_code !== "string" || discount_code.length > 200)) ||
      (gift_to !== undefined && (typeof gift_to !== "string" || gift_to.length > 200))) {
      return flowError(9004, "The purchase input is invalid", 400, cors_origin);
    }
    const item_result = await request_flow_api(context, "/api/v2/shop/item", { query: { id: item_id } });
    if (item_result.error) return item_result.error;
    const result = await request_flow_api(context, "/api/v2/shop/buy", {
      method: "POST", body: { item_id, quantity, options, ...(amount === undefined ? {} : { amount }), ...(discount_code ? { discount_code } : {}), ...(gift_to ? { gift_to } : {}) }
    });
    if (result.error) return result.error;
    return flow_response(body.flow_token, [shop_subtask(item_result.data, result.data)], cors_origin, result.headers);
  }
});
