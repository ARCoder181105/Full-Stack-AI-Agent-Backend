import { inngest } from "../client.js";
import User from "../../models/User.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";

export const onUserSignup = inngest.createFunction(
  { id: "on-user-signup", retries: 2 },
  { event: "user/signup" },
  async ({ event, step }) => {
    try {
      const { email } = event.data;

      const user = await step.run("get-user-email", async () => {
        const userObject = await User.findOne({ email });
        if (!userObject) {
          throw new NonRetriableError("User no longer exists in our database");
        }
        return userObject;
      });

      await step.run("send-welcome-email", async () => {
        const subject = "Welcome to the App!";
        const text = `Hi ${user.email},\n\nThanks for signing up. We're glad to have you onboard!`;
        const html = `
          <h2>Hi ${user.email},</h2>
          <p>Thanks for signing up. We're excited to have you with us! 🎉</p>
          <p>— The Team</p>
        `;

        await sendMail({ to: user.email, subject, text, html });
      });

      return { success: true };
    } catch (error) {
      console.error("❌ Error in Inngest Function:", error.stack || error.message);
      return { success: false, message: error.message };
    }
  }
);
