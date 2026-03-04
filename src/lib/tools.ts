import { tool } from "ai";
import { z } from "zod";

// In-memory question counter keyed by session_id
const questionCounters = new Map<string, number>();

const stubQuestions = [
  "Tell me about a challenging technical project you worked on recently. What was your role, and what made it challenging?",
  "How do you approach debugging a complex issue in a production system?",
  "Describe your experience with system design. How would you design a URL shortener?",
  "What's a technical decision you made that you later regretted? What did you learn from it?",
];

export const tools = {
  initiate_session: tool({
    description: "Start a new interview session",
    inputSchema: z.object({
      candidate_name: z.string().optional().describe("Name of the candidate"),
    }),
    execute: async ({ candidate_name }) => {
      const sessionId = "stub-session-1";
      questionCounters.set(sessionId, 0);
      return {
        session_id: sessionId,
        candidate_name: candidate_name ?? "Anonymous",
        message: "Session started",
      };
    },
  }),

  get_next_question: tool({
    description:
      "Get the next interview question. Returns done: true when all questions have been asked.",
    inputSchema: z.object({
      session_id: z.string().describe("The session ID"),
    }),
    execute: async ({ session_id }) => {
      const index = questionCounters.get(session_id) ?? 0;

      if (index >= stubQuestions.length) {
        return { done: true as const };
      }

      questionCounters.set(session_id, index + 1);

      return {
        done: false as const,
        question_id: `q${index + 1}`,
        question_text: stubQuestions[index],
        question_number: index + 1,
        total_estimate: stubQuestions.length,
      };
    },
  }),

  submit_question_answer: tool({
    description: "Submit the candidate's answer to a question",
    inputSchema: z.object({
      session_id: z.string().describe("The session ID"),
      question_id: z.string().describe("The question ID being answered"),
      candidate_response: z
        .string()
        .describe("The candidate's answer verbatim"),
    }),
    execute: async ({ session_id, question_id, candidate_response }) => {
      console.log(
        `[stub] Answer recorded for ${question_id} in session ${session_id}: ${candidate_response.substring(0, 80)}...`
      );
      return { recorded: true };
    },
  }),

  close_session: tool({
    description: "Close the interview session when all questions are done",
    inputSchema: z.object({
      session_id: z.string().describe("The session ID"),
    }),
    execute: async ({ session_id }) => {
      questionCounters.delete(session_id);
      return { status: "completed" };
    },
  }),
};
