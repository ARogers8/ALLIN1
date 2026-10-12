/**
 * Creates a demo account with five weeks of realistic history so every screen
 * has something to show. Log in with demo@allin1.app / demo1234.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, todayKey } from "../src/lib/dates";
import { normalizeKey } from "../src/lib/text";
import { findLibraryExercise, workoutCalories } from "../src/lib/exercises";

const db = new PrismaClient();
const EMAIL = "demo@allin1.app";

// Deterministic pseudo-random numbers so the seed looks the same every run.
let s = 42;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

const FOODS = [
  { meal: "BREAKFAST", name: "Greek yogurt with berries and granola", servingDesc: "200 g 2% yogurt, 75 g mixed berries, 30 g granola", calories: 365, protein: 24, carbs: 46, fat: 9 },
  { meal: "BREAKFAST", name: "Scrambled eggs on toast", servingDesc: "3 large eggs, 1 tsp butter, 2 slices sourdough", calories: 470, protein: 26, carbs: 38, fat: 22 },
  { meal: "LUNCH", name: "Chipotle chicken burrito bowl", servingDesc: "White rice, black beans, chicken, fresh tomato salsa, cheese, lettuce", calories: 705, protein: 54, carbs: 74, fat: 22 },
  { meal: "LUNCH", name: "Subway Philly Cheesesteak", servingDesc: "6-inch on Italian (white), provolone, green peppers, onions, mayo", calories: 470, protein: 29, carbs: 44, fat: 19 },
  { meal: "DINNER", name: "Salmon, rice and broccoli", servingDesc: "170 g salmon, 1 cup jasmine rice, 1 cup broccoli, 1 tsp olive oil", calories: 690, protein: 45, carbs: 50, fat: 32 },
  { meal: "DINNER", name: "Chicken stir-fry", servingDesc: "200 g chicken breast, mixed veg, 1 tbsp oil, 1 cup rice, soy sauce", calories: 720, protein: 58, carbs: 70, fat: 20 },
  { meal: "SNACK", name: "Protein shake", servingDesc: "1 scoop whey isolate with water", calories: 120, protein: 25, carbs: 2, fat: 1 },
  { meal: "SNACK", name: "Apple and peanut butter", servingDesc: "1 medium apple, 2 tbsp peanut butter", calories: 285, protein: 8, carbs: 31, fat: 16 },
] as const;

const PUSH = [
  { name: "Bench Press", sets: [[8, 185], [8, 185], [7, 185], [6, 185]] },
  { name: "Incline Dumbbell Press", sets: [[10, 60], [10, 60], [9, 60]] },
  { name: "Lateral Raise", sets: [[15, 20], [15, 20], [14, 20]] },
  { name: "Tricep Pushdown", sets: [[12, 50], [12, 50], [11, 50]] },
];
const PULL = [
  { name: "Deadlift", sets: [[5, 275], [5, 275], [5, 275]] },
  { name: "Pull-Up", sets: [[8, 0], [7, 0], [6, 0]] },
  { name: "Seated Cable Row", sets: [[10, 140], [10, 140], [10, 140]] },
  { name: "Bicep Curl", sets: [[12, 30], [11, 30], [10, 30]] },
];
const LEGS = [
  { name: "Squat", sets: [[6, 225], [6, 225], [6, 225], [5, 225]] },
  { name: "Romanian Deadlift", sets: [[10, 185], [10, 185], [10, 185]] },
  { name: "Leg Press", sets: [[12, 360], [12, 360], [10, 360]] },
  { name: "Calf Raise", sets: [[15, 135], [15, 135], [15, 135]] },
];
const LB = 0.45359237;

async function main() {
  await db.user.deleteMany({ where: { email: EMAIL } });
  const user = await db.user.create({
    data: {
      email: EMAIL,
      name: "Alex",
      passwordHash: await bcrypt.hash("demo1234", 12),
      onboarded: true,
      sex: "MALE",
      birthDate: new Date("1998-05-14T00:00:00Z"),
      heightCm: 180,
      units: "IMPERIAL",
      goal: "CUT",
      weeklyRateKg: 1 * LB,
      goalWeightKg: 175 * LB,
    },
  });

  const today = todayKey();
  const DAYS = 35;
  const plan = [PUSH, PULL, LEGS];
  let split = 0;

  for (let i = DAYS; i >= 0; i--) {
    const date = addDays(today, -i);
    // ~1.1 lb/week loss with daily water noise.
    const lb = 192 - ((DAYS - i) / 7) * 1.1 + (rand() - 0.5) * 2.2;
    if (rand() > 0.1) await db.weightEntry.create({ data: { userId: user.id, date, weightKg: lb * LB } });
    if (i === 0) continue; // leave today mostly empty to log live

    await db.stepEntry.create({ data: { userId: user.id, date, steps: Math.round(6000 + rand() * 7000) } });

    const picks = (["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const).map((meal) => {
      const options = FOODS.filter((f) => f.meal === meal);
      return options[Math.floor(rand() * options.length)];
    });
    // A post-workout shake most days, on top of the regular snack.
    if (rand() > 0.3) picks.push(FOODS.find((f) => f.name === "Protein shake")!);
    for (const f of picks) {
      const meal = f.meal;
      const saved = await db.savedFood.upsert({
        where: { userId_key: { userId: user.id, key: normalizeKey(f.name) } },
        create: { userId: user.id, key: normalizeKey(f.name), name: f.name, servingDesc: f.servingDesc, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, timesLogged: 1 },
        update: { timesLogged: { increment: 1 }, lastUsedAt: new Date() },
      });
      await db.foodEntry.create({
        data: { userId: user.id, date, meal, name: f.name, servingDesc: f.servingDesc, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, savedFoodId: saved.id },
      });
    }

    const weekday = new Date(date + "T12:00:00Z").getUTCDay();
    if (weekday !== 0 && weekday !== 3) {
      const program = plan[split++ % plan.length];
      const exercises = [];
      for (const e of program) {
        const lib = findLibraryExercise(e.name)!;
        exercises.push(
          await db.exercise.upsert({
            where: { userId_key: { userId: user.id, key: normalizeKey(e.name) } },
            create: { userId: user.id, key: normalizeKey(e.name), name: lib.name, kind: lib.kind, met: lib.met },
            update: {},
          }),
        );
      }
      const { calories, minutes } = workoutCalories(
        exercises.map((ex, j) => ({ met: ex.met, kind: ex.kind, sets: program[j].sets.map(() => ({})) })),
        88,
        55,
      );
      await db.workout.create({
        data: {
          userId: user.id,
          date,
          name: program === PUSH ? "Push day" : program === PULL ? "Pull day" : "Leg day",
          durationMin: minutes,
          caloriesBurned: calories,
          sets: {
            create: exercises.flatMap((ex, j) =>
              program[j].sets.map(([reps, w], k) => ({ exerciseId: ex.id, order: j * 100 + k, reps, weightKg: w ? w * LB : null })),
            ),
          },
        },
      });
    }
  }
  console.log(`Seeded ${EMAIL} / demo1234`);
}

main().finally(() => db.$disconnect());
