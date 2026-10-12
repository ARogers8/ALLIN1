import "server-only";
import { db } from "./db";
import type { AppUser } from "./auth";
import type { ProfileDefaults } from "@/components/profile-form";

export async function profileDefaults(user: AppUser): Promise<ProfileDefaults> {
  const latest = await db.weightEntry.findFirst({ where: { userId: user.id }, orderBy: { date: "desc" } });
  return {
    name: user.name,
    sex: user.sex,
    birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
    heightCm: user.heightCm,
    units: user.units,
    goal: user.goal,
    weeklyRateKg: user.weeklyRateKg,
    goalWeightKg: user.goalWeightKg,
    weightKg: latest?.weightKg ?? null,
  };
}
