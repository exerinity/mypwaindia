import { defineFlowTask, flow_response, flowToken, text } from "./shared.js";

export default defineFlowTask({
  name: "sc_tomb",

  match(task) {
    return task === "sc_tomb" ? {} : null;
  },

  get({ corsOrigin }) {
    return flow_response(flowToken("sc_tomb."), [
      {
        subtask_id: "TextContent",
        type: "text_content",
        text_content: {
          primary_text: text("Scambait mode has been removed"),
          paragraphs: [
            text("As of the 6th of October 2026, scambait mode has been completely pulled from MyPWAIndia, for several reasons."),
            text("The first one, and probably the most important one, is that it entirely failed. Scambait mode was created for obviously scambaiting, but the app itself was already so over-the-top that it was like a clown at a circus; it didn't really make the app look the app realistic, it just made it look even more silly"),
            text("So when it was actually on the field, any scammers who we actually attempted to scambait with this were pretty suspicious and in the end, just did not work."),
            text("The second reason is that nobody else used it. According to the analytics, out of the 690 visitors or 1461 total visits of all time (since ~June 2026), the page to activate scambait mode had 51 visitors or 73 total visits. That's about 7.4%, and how many of those 7.4% who actually activated it is probably close to nil."),
            text("The third reason is AI agents and consequently, AI search agents. I am so sick and tired of AI search agents, like Google and their utter joke and waste of money they call \"Gemini\" or \"AI Mode\", treating this little easter egg of the app as a huge massively detailed standout feature, or even worse, an AI search agent not being able to wrap its head around what a parody is. I hate that I'm anthropomorphizing extremely stupid AI agents but I don't know how else to convey this. It is extremely annoying."),
            text("So, in a nutshell, scambait mode was a failure, and it has been ripped out of the app.")

          ],
        },
        subtask_back_navigation: "hide_explicit_cta"
      }
    ], corsOrigin);
  }
});
