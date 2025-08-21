// src/utils/ai.js
import { createAgent, gemini } from "@inngest/agent-kit";

/**
 * Analyzes a support ticket using an AI agent to extract structured data.
 * @param {object} step - The Inngest step object.
 * @param {object} ticket - The ticket object containing title and description.
 * @returns {Promise<object|null>} A promise that resolves to a JSON object with the analysis or null on failure.
 */
const analyzeTicket = async (step, ticket) => {
    const supportAgent = createAgent({
        model: gemini({
            model: "gemini-1.5-flash-8b",
            apiKey: process.env.GEMINI_API_KEY,
        }),
        name: "AI Ticket Triage Assistant",
        system: `You are an expert AI assistant that processes technical support tickets. Your task is to analyze the ticket information and respond with *only* a valid, raw JSON object.

Do NOT include markdown, code fences (like \`\`\`json), comments, or any extra text.

The JSON object must have the following structure:
- "summary": A short 1-2 sentence summary of the issue.
- "priority": One of "low", "medium", or "high".
- "helpfulNotes": A detailed technical explanation and potential steps for a human moderator to resolve the issue. Include external resource links if relevant.
- "relatedSkills": An array of technical skills required to solve this (e.g., ["React", "MongoDB", "CSS"]).`,
    });

    try {
        const response = await supportAgent.run(
            `Ticket Title: ${ticket.title}\nTicket Description: ${ticket.description}`
        );

        console.log("🧠 Full AI response:", response);

        const rawOutput = response.output?.[0]?.content;

        if (!rawOutput || typeof rawOutput !== "string") {
            console.error("❌ AI output is missing or malformed");
            return null;
        }

        // ✅ Remove code block fences like ```json ... ```
        const cleaned = rawOutput.replace(/```json|```/g, "").trim();

        // ✅ Parse the cleaned string into a JSON object
        return JSON.parse(cleaned);
    } catch (e) {
        console.error("❌ Failed to analyze ticket:", e.message);
        return null;
    }
};

export default analyzeTicket;