import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser, needsVerification } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeKey } from "@/lib/text";
import { analyzeFood } from "@/lib/nutrition-ai";

export const maxDuration = 120;

const Body = z.object({
  text: z.string().max(2000).optional(),
  image: z
    .object({
      data: z.string().max(8_000_000),
      mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
    })
    .optional(),
  answers: z.array(z.object({ question: z.string().max(500), answer: z.string().max(500) })).max(20).optional(),
  rounds: z.number().int().min(0).max(5).optional(),
  /** Ignore remembered foods and ask the AI fresh. */
  fresh: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (needsVerification(user)) return NextResponse.json({ error: "Verify your email first" }, { status: 403 });
  const userId = user.id;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;
  if (!input.text?.trim() && !input.image) return NextResponse.json({ error: "Describe what you ate or add a photo" }, { status: 400 });

  // Remembered food: if you've logged this exact thing before, reuse it instantly.
  if (!input.image && !input.answers?.length && !input.fresh && input.text) {
    const saved = await db.savedFood.findUnique({ where: { userId_key: { userId, key: normalizeKey(input.text) } } });
    if (saved) {
      return NextResponse.json({
        source: "memory",
        savedFoodId: saved.id,
        status: "complete",
        questions: [],
        confidence: "high",
        notes: `You've logged this ${saved.timesLogged} time${saved.timesLogged === 1 ? "" : "s"} before, so I used your saved nutrition.`,
        items: [
          {
            name: saved.name,
            servingDescription: saved.servingDesc,
            calories: saved.calories,
            protein_g: saved.protein,
            carbs_g: saved.carbs,
            fat_g: saved.fat,
            fiber_g: saved.fiber,
            sugar_g: saved.sugar,
            sodium_mg: saved.sodium,
          },
        ],
      });
    }
  }

  try {
    const result = await analyzeFood(input);
    return NextResponse.json({ source: "ai", ...result });
  } catch (e) {
    // Log the real error for the server logs, but never show it to users: SDK errors can echo request headers.
    console.error("Food analysis failed", e);
    const message = e instanceof Error ? e.message : "";
    if (message.includes("ANTHROPIC_API_KEY")) {
      return NextResponse.json({ error: "Food analysis isn't set up yet. Add an ANTHROPIC_API_KEY to the server's environment." }, { status: 503 });
    }
    const status = typeof e === "object" && e && "status" in e ? (e as { status?: number }).status : undefined;
    const invalidKey = status === 401 || status === 403 || /header/i.test(message);
    return NextResponse.json(
      {
        error: invalidKey
          ? "Food analysis is misconfigured: the server's ANTHROPIC_API_KEY isn't a valid key."
          : "Couldn't analyze that right now. Try again in a moment.",
      },
      { status: invalidKey ? 503 : 502 },
    );
  }
}
