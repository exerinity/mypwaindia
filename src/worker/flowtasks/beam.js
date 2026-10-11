import { start_beam } from "../beam.js";
import { defineFlowTask, flow_response, flowToken, text } from "./shared.js";

export default defineFlowTask({
  name: "beam",

  match(task) {
    return task === "beam" ? {} : null;
  },

  async get({ req, url, env, corsOrigin }) {
    if (url.searchParams.has("error")) {
      const error = url.searchParams.get("error");
      const message = error === "access_denied"
        ? "You did not approve sign-in"
        : error === "expired"
          ? "This sign-in expired. Please try again later."
          : "Oops, something went wrong. Please try again later.";
      return flow_response(flowToken("beam."), [{
        subtask_id: "BeamError",
        type: "text_content",
        text_content: {
          primary_text: text("Sign-in did not finish"),
          paragraphs: [text(message)]
        },
        subtask_back_navigation: "hide_explicit_cta"
      }], corsOrigin);
    }

    if (url.searchParams.get("complete") === "1") {
      return flow_response(flowToken("beam."), [{
        subtask_id: "BeamReady",
        type: "beam_ready",
        subtask_back_navigation: "hide_explicit_cta"
      }], corsOrigin);
    }

    try {
      const { url: authorization_url, headers } = await start_beam(req, env);
      return flow_response(flowToken("beam."), [{
        subtask_id: "BeamRedirect",
        type: "beam_redirect",
        beam_redirect: { authorization_url },
        subtask_back_navigation: "hide_explicit_cta"
      }], corsOrigin, headers);
    } catch {
      return flow_response(flowToken("beam."), [{
        subtask_id: "BeamError",
        type: "text_content",
        text_content: {
          primary_text: text("Sign-in is unavailable"),
          paragraphs: [text("Oops, something went wrong. Please try again later.")]
        },
        subtask_back_navigation: "hide_explicit_cta"
      }], corsOrigin);
    }
  }
});
