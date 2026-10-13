"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentUser, currentUserId } from "@/lib/auth";
import { isDayKey } from "@/lib/dates";
import { toKg } from "@/lib/units";
import { normalizeKey } from "@/lib/text";
import { EXERCISE_LIBRARY, findLibraryExercise, workoutCalories } from "@/lib/exercises";

async function uid() {
  const id = await currentUserId();
  if (!id) redirect("/login");
  return id;
}

function day(d: unknown): string {
  if (typeof d !== "string" || !isDayKey(d)) throw new Error("Invalid date");
  return d;
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------- weight

export async function logWeight(date: string, value: number) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const weightKg = toKg(value, user.units);
  if (!(weightKg > 25 && weightKg < 350)) return { error: "Enter a realistic weight" };
  const d = day(date);
  await db.weightEntry.upsert({
    where: { userId_date: { userId: user.id, date: d } },
    create: { userId: user.id, date: d, weightKg },
    update: { weightKg },
  });
  refresh();
  return { ok: true };
}

export async function deleteWeight(id: string) {
  const userId = await uid();
  await db.weightEntry.deleteMany({ where: { id, userId } });
  refresh();
}

// ---------------------------------------------------------------- steps

export async function logSteps(date: string, steps: number) {
  const userId = await uid();
  const d = day(date);
  const n = Math.round(steps);
  if (!(n >= 0 && n <= 150_000)) return { error: "Enter a realistic step count" };
  await db.stepEntry.upsert({
    where: { userId_date: { userId, date: d } },
    create: { userId, date: d, steps: n },
    update: { steps: n },
  });
  refresh();
  return { ok: true };
}

// ---------------------------------------------------------------- food

const Meal = z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]);
const Nutrition = z.object({
  // Long AI descriptions are trimmed to fit rather than rejected, so a wordy answer can't fail the save.
  name: z.string().trim().min(1).transform((v) => v.slice(0, 120)),
  servingDesc: z.string().trim().default("").transform((v) => v.slice(0, 300)),
  calories: z.number().min(0).max(20_000),
  protein: z.number().min(0).max(2000),
  carbs: z.number().min(0).max(3000),
  fat: z.number().min(0).max(2000),
  fiber: z.number().min(0).max(500).default(0),
  sugar: z.number().min(0).max(2000).default(0),
  sodium: z.number().min(0).max(100_000).default(0),
});
type NutritionInput = z.input<typeof Nutrition>;

async function remember(userId: string, key: string, n: z.output<typeof Nutrition>) {
  if (!key) return null;
  return db.savedFood.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, ...n, timesLogged: 1 },
    update: { ...n, timesLogged: { increment: 1 }, lastUsedAt: new Date() },
  });
}

/**
 * Logs foods (from the AI, a manual entry or a saved food) and remembers their
 * nutrition so the same thing is instant next time. `phrase` is what the user
 * originally typed; it's remembered too, so typing it again skips the AI.
 */
export async function logFoods(input: { date: string; meal: string; items: NutritionInput[]; servings?: number; phrase?: string }) {
  const userId = await uid();
  const d = day(input.date);
  const meal = Meal.parse(input.meal);
  const items = z.array(Nutrition).min(1).max(20).parse(input.items);
  const servings = z.number().positive().max(50).parse(input.servings ?? 1);

  for (const item of items) {
    const saved = await remember(userId, normalizeKey(item.name), item);
    await db.foodEntry.create({
      data: {
        userId,
        date: d,
        meal,
        name: item.name,
        servingDesc: item.servingDesc,
        servings,
        calories: item.calories * servings,
        protein: item.protein * servings,
        carbs: item.carbs * servings,
        fat: item.fat * servings,
        fiber: item.fiber * servings,
        sugar: item.sugar * servings,
        sodium: item.sodium * servings,
        savedFoodId: saved?.id,
      },
    });
  }

  // Remember the phrase as a whole ("subway footlong philly + chips") for one-tap re-logging.
  const phraseKey = input.phrase ? normalizeKey(input.phrase) : "";
  if (phraseKey && !items.some((i) => normalizeKey(i.name) === phraseKey)) {
    const sum = items.reduce(
      (a, i) => ({
        calories: a.calories + i.calories,
        protein: a.protein + i.protein,
        carbs: a.carbs + i.carbs,
        fat: a.fat + i.fat,
        fiber: a.fiber + i.fiber,
        sugar: a.sugar + i.sugar,
        sodium: a.sodium + i.sodium,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
    );
    const name = items.length === 1 ? items[0].name : input.phrase!.trim().slice(0, 120);
    const servingDesc = items.length === 1 ? items[0].servingDesc : items.map((i) => i.name).join(" + ").slice(0, 300);
    await remember(userId, phraseKey, { name, servingDesc, ...sum });
  }

  refresh();
  return { ok: true };
}

export async function logSavedFood(input: { date: string; meal: string; savedFoodId: string; servings: number }) {
  const userId = await uid();
  const saved = await db.savedFood.findFirst({ where: { id: input.savedFoodId, userId } });
  if (!saved) return { error: "That food isn't saved anymore" };
  return logFoods({
    date: input.date,
    meal: input.meal,
    servings: input.servings,
    items: [saved],
  });
}

export async function deleteFood(id: string) {
  const userId = await uid();
  await db.foodEntry.deleteMany({ where: { id, userId } });
  refresh();
}

export async function forgetSavedFood(id: string) {
  const userId = await uid();
  await db.savedFood.deleteMany({ where: { id, userId } });
  refresh();
}

/** Copies one meal from another day (e.g. "same breakfast as yesterday"). */
export async function copyMeal(input: { fromDate: string; toDate: string; meal: string }) {
  const userId = await uid();
  const meal = Meal.parse(input.meal);
  const rows = await db.foodEntry.findMany({ where: { userId, date: day(input.fromDate), meal } });
  if (!rows.length) return { error: "Nothing logged for that meal" };
  await db.foodEntry.createMany({
    data: rows.map((r) => ({
      userId,
      date: day(input.toDate),
      meal,
      name: r.name,
      servingDesc: r.servingDesc,
      servings: r.servings,
      calories: r.calories,
      protein: r.protein,
      carbs: r.carbs,
      fat: r.fat,
      fiber: r.fiber,
      sugar: r.sugar,
      sodium: r.sodium,
      savedFoodId: r.savedFoodId,
    })),
  });
  refresh();
  return { ok: true, count: rows.length };
}

// ---------------------------------------------------------------- workouts

const SetSchema = z.object({
  reps: z.number().int().min(0).max(1000).nullable().optional(),
  weight: z.number().min(0).max(2000).nullable().optional(),
  durationMin: z.number().min(0).max(1440).nullable().optional(),
  distance: z.number().min(0).max(1000).nullable().optional(),
});

const WorkoutSchema = z.object({
  date: z.string(),
  name: z.string().trim().max(80).default(""),
  totalMinutes: z.number().min(0).max(1440).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
  exercises: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        kind: z.enum(["STRENGTH", "CARDIO"]),
        sets: z.array(SetSchema).min(1).max(50),
      }),
    )
    .min(1)
    .max(40),
});

export type WorkoutInput = z.input<typeof WorkoutSchema>;

export async function saveWorkout(input: WorkoutInput) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const parsed = WorkoutSchema.safeParse(input);
  if (!parsed.success) return { error: "Add at least one exercise with a set" };
  const w = parsed.data;
  const d = day(w.date);
  const imperial = user.units === "IMPERIAL";

  const latest = await db.weightEntry.findFirst({ where: { userId: user.id, date: { lte: d } }, orderBy: { date: "desc" } });
  const bodyKg = latest?.weightKg ?? 70;

  // Remember every exercise so it autocompletes next time.
  const exercises = [];
  for (const ex of w.exercises) {
    const key = normalizeKey(ex.name);
    const lib = findLibraryExercise(ex.name);
    const met = lib?.met ?? (ex.kind === "CARDIO" ? 7 : 5);
    exercises.push(
      await db.exercise.upsert({
        where: { userId_key: { userId: user.id, key } },
        create: { userId: user.id, key, name: lib?.name ?? ex.name, kind: lib?.kind ?? ex.kind, met },
        update: {},
      }),
    );
  }

  const sets = w.exercises.map((ex) =>
    ex.sets.map((s) => ({
      reps: s.reps ?? null,
      weightKg: s.weight != null ? toKg(s.weight, user.units) : null,
      durationMin: s.durationMin ?? null,
      distanceKm: s.distance != null ? (imperial ? s.distance * 1.609344 : s.distance) : null,
    })),
  );

  const { calories, minutes } = workoutCalories(
    exercises.map((e, i) => ({ met: e.met, kind: e.kind, sets: sets[i] })),
    bodyKg,
    w.totalMinutes,
  );

  const name = w.name || defaultWorkoutName(exercises.map((e) => e.name));
  await db.workout.create({
    data: {
      userId: user.id,
      date: d,
      name,
      durationMin: minutes,
      caloriesBurned: calories,
      notes: w.notes || null,
      sets: {
        create: exercises.flatMap((e, i) => sets[i].map((s, j) => ({ exerciseId: e.id, order: i * 100 + j, ...s }))),
      },
    },
  });
  refresh();
  return { ok: true, calories };
}

function defaultWorkoutName(names: string[]): string {
  const groups = new Set(names.map((n) => EXERCISE_LIBRARY.find((e) => e.name === n)?.group).filter(Boolean));
  if (groups.size === 0) return "Workout";
  if (groups.size === 1) return `${[...groups][0]} day`;
  if (groups.size === 2) return `${[...groups].join(" & ")}`;
  return "Full body";
}

export async function deleteWorkout(id: string) {
  const userId = await uid();
  await db.workout.deleteMany({ where: { id, userId } });
  refresh();
}
