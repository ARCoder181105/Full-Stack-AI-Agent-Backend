import { inngest } from "../client.js";
import Ticket from "../../models/ticket.js";
import User from "../../models/User.js";
import { NonRetriableError } from "inngest";
import { sendMail } from "../../utils/mailer.js";
import analyzeTicket from "../../utils/ai.js"; // ✅ Import your AI utility

export const onTicketCreated = inngest.createFunction(
  { id: "on-ticket-created", retries: 2 },
  { event: "ticket/created" },
  async ({ event, step }) => {
    try {
      // 0. Validate input
      if (!event?.data?.ticketId) {
        throw new NonRetriableError("ticketId missing in event data");
      }

      // 1. Fetch the ticket
      const ticket = await step.run("fetch-ticket", async () => {
        const ticketObject = await Ticket.findById(event.data.ticketId);
        if (!ticketObject) {
          throw new NonRetriableError("Ticket not found");
        }
        return ticketObject;
      });

      // 2. Analyze ticket using AI utility
      const aiResponse = await analyzeTicket(step, ticket);
      if (!aiResponse) {
        throw new NonRetriableError("AI failed to analyze ticket");
      }

      // 3. Assign moderator and update ticket
      const moderator = await step.run("assign-moderator-and-update-ticket", async () => {
        let assignedUser;
        const skills = aiResponse.relatedSkills || [];

        if (skills.length > 0) {
          assignedUser = await User.findOne({
            role: "moderator",
            skills: { $in: skills.map(skill => new RegExp(skill, "i")) },
          });
        }

        if (!assignedUser) {
          assignedUser = await User.findOne({ role: "admin" });
        }

        if (!assignedUser) {
          throw new Error("No moderator or admin found to assign the ticket.");
        }

        await Ticket.findByIdAndUpdate(ticket._id, {
          status: "IN_PROGRESS",
          priority: ["low", "medium", "high"].includes(aiResponse.priority)
            ? aiResponse.priority
            : "medium",
          helpfulNotes: aiResponse.helpfulNotes,
          relatedSkills: aiResponse.relatedSkills,
          assignedTo: assignedUser._id,
        });

        return assignedUser;
      });

      // 4. Email notification
      console.log("📬 Notifying moderator:", moderator.email);
      await step.run("send-email-notification", async () => {
        if (moderator?.email) {
          await sendMail({
            to: moderator.email,
            subject: `New Ticket Assigned: "${ticket.title}"`,
            text: `A new ticket has been assigned to you. Please check the ticket dashboard for details.`,
          });
        } else {
          console.warn("⚠️ Moderator email missing. Skipping email.");
        }
      });

      return {
        success: true,
        message: `Ticket ${ticket._id} assigned to ${moderator.email}`,
      };
    } catch (error) {
      console.error("❌ Error running the on-ticket-created function", error);
      throw error;
    }
  }
);
