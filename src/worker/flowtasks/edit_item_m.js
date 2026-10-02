import { defineFlowTask, flowError, flowToken, text, request_flow_api, flow_response } from "./shared.js";

const item_fields = ["name", "price", "pwyw", "description", "stock", "delivery", "instant_type", "instant_content", "hidden", "options"];

export default defineFlowTask({
  name: "edit_item_m",
  abortActions: { EditShopItem: ["cancel"] },

  match(task) {
    return task === "edit_item_m" ? {} : null;
  },

  async get(context) {
    const { url, corsOrigin: cors_origin } = context;
    const raw_id = url.searchParams.get("item_id");
    const item_id = raw_id === null ? null : Number(raw_id);
    if (item_id !== null && (!/^\d+$/.test(raw_id) || !Number.isSafeInteger(item_id) || item_id < 1)) {
      return flowError(9004, "The item ID is invalid", 400, cors_origin);
    }
    const result = await request_flow_api(context, "/api/v2/shop/my/items");
    if (result.error) return result.error;
    if (!Array.isArray(result.data.items)) return flowError("invalid_upstream_response", "The shop returned invalid items", 502, cors_origin);
    const item = item_id === null ? null : result.data.items.find((candidate) => candidate.id === item_id);
    if (item_id !== null && (!item || item.status === "archived")) return flowError(9005, "Not your item or item is archived", 404, cors_origin);
    return flow_response(flowToken("edit_item_m."), [{
      subtask_id: "EditShopItem",
      type: "shop_item_editor",
      shop_item_editor: {
        primary_text: text(item ? "Edit shop item" : "New shop item"),
        success_text: text(item ? "Item saved" : "Item created"),
        image_delivery_text: text("This item uses image delivery. Manage its delivery on MyPayIndia.com"),
        item,
        labels: {
          name: "Name", description: "Description", price: "Unit price (INR)", pwyw: "Let buyers pay what they want (price is the minimum)", stock: "Stock (blank for unlimited)",
          hidden: "Hide from my profile", delivery: "Delivery", instant_type: "Delivery type", instant_content: "Content delivered to buyers",
          buyer_fields: "Buyer fields", option_label: "Label", option_type: "Type", required: "Required", extra_price: "Extra price (INR)",
          choice_label: "Choice label", remove_choice: "Remove choice", add_choice: "Add choice", remove_field: "Remove field", add_field: "Add buyer field"
        },
        limits: { name: 100, description: 2000 },
        delivery_options: [{ value: "manual", label: "Manual" }, { value: "instant", label: "Instant" }],
        instant_options: [{ value: "text", label: "Text" }, { value: "url", label: "URL" }],
        option_types: [{ value: "text", label: "Text" }, { value: "checkbox", label: "Checkbox" }, { value: "select", label: "Select" }],
        actions: [
          { link_type: "task", link_id: "save", label: "Save item", pending_label: "Saving..." },
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
    if (input?.subtask_id !== "EditShopItem" || input.action_id !== "save" || !values || typeof values !== "object" || Array.isArray(values) ||
      !values.fields || typeof values.fields !== "object" || Array.isArray(values.fields)) {
      return flowError("invalid_subtask_input", "The item input is invalid", 400, cors_origin);
    }
    const item_id = values.id;
    if (item_id !== null && (!Number.isSafeInteger(item_id) || item_id < 1)) return flowError(9004, "The item ID is invalid", 400, cors_origin);
    const fields = Object.fromEntries(Object.entries(values.fields).filter(([key]) => item_fields.includes(key)));
    const result = await request_flow_api(context, item_id === null ? "/api/v2/shop/items/create" : "/api/v2/shop/items/update", {
      method: "POST", body: { ...fields, ...(item_id === null ? {} : { id: item_id }) }
    });
    if (result.error) return result.error;
    return flow_response(body.flow_token, [], cors_origin, result.headers);
  }
});
