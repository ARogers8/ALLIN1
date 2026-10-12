import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUserId } from "@/lib/auth";
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
  const userId = await currentUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

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
    const message = e instanceof Error ? e.message : "Something went wrong";
    const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 502;
    return NextResponse.json(
      { error: status === 503 ? "Food analysis isn't set up yet. Add an ANTHROPIC_API_KEY to the server's environment." : message },
      { status },
    );
  }
}
