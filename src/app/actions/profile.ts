"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUserId, userToday } from "@/lib/auth";
import { CM_PER_IN, toKg } from "@/lib/units";

export type ProfileState = { error?: string; ok?: boolean } | undefined;

const num = z.coerce.number();

const ProfileSchema = z.object({
  name: z.string().trim().min(1).max(60),
  sex: z.enum(["MALE", "FEMALE"]),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your birthday"),
  units: z.enum(["IMPERIAL", "METRIC"]),
  heightFt: num.optional(),
  heightIn: num.optional(),
  heightCm: num.optional(),
  weight: num.optional(),
  goal: z.enum(["CUT", "MAINTAIN", "BULK"]),
  weeklyRate: num.min(0).max(2),
  goalWeight: z.union([num.positive(), z.literal("").transform(() => undefined)]).optional(),
});

export async function saveProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const userId = await currentUserId();
  if (!userId) redirect("/login");
  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => v !== ""));
  const parsed = ProfileSchema.safeParse({ goalWeight: "", ...raw });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;

  const heightCm = p.units === "METRIC" ? p.heightCm : ((p.heightFt ?? 0) * 12 + (p.heightIn ?? 0)) * CM_PER_IN;
  if (!heightCm || heightCm < 100 || heightCm > 250) return { error: "Enter a realistic height" };

  const birth = new Date(p.birthDate + "T00:00:00Z");
  const age = (Date.now() - birth.getTime()) / (365.25 * 86_400_000);
  if (age < 13 || age > 110) return { error: "You need to be at least 13 to use ALLIN1" };

  const existing = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (!existing.onboarded && !p.weight) return { error: "Enter your current weight" };
  const weeklyRateKg = p.goal === "MAINTAIN" ? 0 : toKg(p.weeklyRate, p.units);

  await db.user.update({
    where: { id: userId },
    data: {
      name: p.name,
      sex: p.sex,
      birthDate: birth,
      heightCm,
      units: p.units,
      goal: p.goal,
      weeklyRateKg,
      goalWeightKg: p.goalWeight ? toKg(p.goalWeight, p.units) : null,
      onboarded: true,
    },
  });

  if (p.weight) {
    const weightKg = toKg(p.weight, p.units);
    if (weightKg < 25 || weightKg > 350) return { error: "Enter a realistic weight" };
    const date = await userToday();
    await db.weightEntry.upsert({
      where: { userId_date: { userId, date } },
      create: { userId, date, weightKg },
      update: { weightKg },
    });
  }

  revalidatePath("/", "layout");
  if (!existing.onboarded) redirect("/dashboard");
  return { ok: true };
}
