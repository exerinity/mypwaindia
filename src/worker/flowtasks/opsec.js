import { corsJson, defineFlowTask, flowToken } from "./shared.js";

const IMAGES = [
  "anon.jpg",
  "bro.jpg",
  "discord.jpg",
  "godinf.jpg",
  "gx.jpg",
  "infinite.jpg",
  "what.jpg",
  "x.jpg"
];

function randomImage() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return IMAGES[values[0] % IMAGES.length];
}

export default defineFlowTask({
  name: "opsec",

  match(task) {
    return task === "opsec" ? {} : null;
  },

  get({ corsOrigin }) {
    const image = randomImage();

    return corsJson({
      success: true,
      data: {
        flow_token: flowToken("opsec."),
        status: "success",
        presentation: {
          kind: "modal",
          animation: "slide",
          close_behavior: "return_or_dash"
        },
        subtasks: [
          {
            subtask_id: "OpsecLevel",
            type: "image",
            image: {
              image_name: image,
              url: `/i/exquisite_imagery/opsec/${image}`,
              alt: image
            },
            subtask_back_navigation: "hide_explicit_cta"
          }
        ]
      }
    }, 200, corsOrigin);
  }
});
