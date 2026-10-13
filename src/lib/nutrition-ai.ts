import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

export const MODEL = "claude-opus-5-5";

const Question = z.object({
  id: z.string().describe("Short stable id, e.g. 'size' or 'bread'"),
  question: z.string().describe("Friendly, specific question, e.g. 'Was it a 6-inch or a footlong?'"),
  options: z.array(z.string()).describe("2-6 tappable answers covering the common choices"),
  allowMultiple: z.boolean().describe("True when several options can apply at once, e.g. toppings"),
});

const Item = z.object({
  name: z.string().describe("Short display name, e.g. 'Subway Philly Cheesesteak'"),
  servingDescription: z.string().describe("Exactly what this portion is, e.g. 'Footlong on Italian Herbs & Cheese, provolone, green peppers, onions, mayo'"),
  calories: z.number(),
  protein_g: z.number(),
  carbs_g: z.number(),
  fat_g: z.number(),
  fiber_g: z.number(),
  sugar_g: z.number(),
  sodium_mg: z.number(),
});

export const AnalysisSchema = z.object({
  status: z.enum(["needs_clarification", "complete"]),
  questions: z.array(Question).describe("Only when status is needs_clarification; at most 4, the ones that move calories the most"),
  items: z.array(Item).describe("Best current estimate for every food eaten, with totals for the portion eaten. Always filled, even when asking questions."),
  confidence: z.enum(["low", "medium", "high"]),
  notes: z.string().describe("One short sentence on the source or key assumption, e.g. 'Based on Subway's published nutrition.'"),
});

export type Analysis = z.infer<typeof AnalysisSchema>;
export type AnalysisItem = z.infer<typeof Item>;

const SYSTEM = `You are the nutrition engine inside ALLIN1, a fitness tracker. People tell you (in text or with a photo) what they ate, and you return precise nutrition for exactly what they ate. Accuracy matters: people use these numbers to cut and bulk.

How to work:
- Use official published nutrition for restaurant and packaged foods whenever you know it (Subway, Chipotle, McDonald's, Starbucks, grocery brands, etc.). For home-made food, use USDA-style reference values and realistic portions.
- Ask follow-up questions only when the answer would change the calories by roughly 10% or more: size (6-inch vs footlong, small/medium/large), bread or base, cheese, sauces and dressings, cooking oil or butter, number of pieces, portion weight, milk type in drinks, and so on. Never ask about things that barely matter.
- Ask at most 4 questions per round, each with tappable options that cover the common answers. Use allowMultiple for things like toppings and sauces.
- If the person already specified a detail, don't ask about it again. If they answer "not sure", assume the most typical choice and say so in notes.
- After the person has answered a round of questions, return status "complete" unless something critical is still unknown. Never ask more than two rounds.
- For photos: identify every food, estimate portion sizes from visual cues (plate size, utensils, packaging), read any visible labels or brand names, and ask about anything you can't see that matters (oil, sauces, hidden fillings).
- Split clearly separate foods into separate items (e.g. a sandwich, chips and a soda are three items). Keep a single dish as one item.
- Item numbers are totals for the portion eaten, not per 100 g. Round calories to the nearest 5 and macros to 1 decimal.
- Always fill items with your best current estimate, even when you are also asking questions.`;

export interface AnalyzeInput {
  text?: string;
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" };
  /** Earlier clarification rounds: what was asked and what the user picked. */
  answers?: { question: string; answer: string }[];
  /** How many rounds of questions have already been answered. */
  rounds?: number;
}

let client: Anthropic | null = null;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic();
  return client;
}

export async function analyzeFood(input: AnalyzeInput): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (input.image) {
    content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
  }
  let prompt = input.text?.trim() ? `What I ate: ${input.text.trim()}` : "What I ate is in this photo.";
  if (input.answers?.length) {
    prompt +=
      "\n\nMy answers to your follow-up questions:\n" +
      input.answers.map((a) => `- ${a.question} → ${a.answer}`).join("\n") +
      "\n\nNow give the final numbers.";
  }
  content.push({ type: "text", text: prompt });

  const response = await getClient().beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(AnalysisSchema) },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") throw new Error("The food analysis was declined. Try describing it differently.");
  if (!response.parsed_output) throw new Error("Couldn't read the nutrition estimate. Please try again.");

  const out = response.parsed_output;
  // Never loop forever: after two rounds of answers, take the best estimate.
  if ((input.rounds ?? 0) >= 2) out.status = "complete";
  if (out.status === "complete") out.questions = [];
  return out;
}
