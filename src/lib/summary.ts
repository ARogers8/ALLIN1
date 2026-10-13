import "server-only";
import { db } from "./db";
import { addDays, ageOn, dayRange } from "./dates";
import {
  CALIBRATION_WINDOW_DAYS,
  calibrate,
  dailyBurn,
  targets,
  weightTrend,
  type Calibration,
  type DayBurn,
  type Targets,
  type TrendPoint,
} from "./energy";
import type { ProfiledUser } from "./auth";

export interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export function sumTotals(rows: Totals[]): Totals {
  return rows.reduce<Totals>(
    (a, r) => ({
      calories: a.calories + r.calories,
      protein: a.protein + r.protein,
      carbs: a.carbs + r.carbs,
      fat: a.fat + r.fat,
      fiber: a.fiber + r.fiber,
      sugar: a.sugar + r.sugar,
      sodium: a.sodium + r.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
  );
}

export interface DaySummary {
  day: string;
  weightKg: number | null;
  /** Trend weight used for all calculations (falls back to latest scale weight). */
  workingWeightKg: number;
  weighedInToday: boolean;
  steps: number;
  workoutCalories: number;
  workoutCount: number;
  eaten: Totals;
  burn: DayBurn;
  calibration: Calibration;
  targets: Targets;
  /** Calories still available today (negative = over target). */
  remaining: number;
  trend: TrendPoint[];
}

/** Everything the dashboard needs for one day, computed from the user's logs. */
export async function daySummary(user: ProfiledUser, day: string): Promise<DaySummary> {
  const windowStart = addDays(day, -(CALIBRATION_WINDOW_DAYS + 30));

  const [weights, foods, steps, workouts] = await Promise.all([
    db.weightEntry.findMany({ where: { userId: user.id, date: { lte: day } }, orderBy: { date: "asc" } }),
    db.foodEntry.groupBy({
      by: ["date"],
      where: { userId: user.id, date: { gte: addDays(day, -CALIBRATION_WINDOW_DAYS), lte: day } },
      _sum: { calories: true, protein: true, carbs: true, fat: true, fiber: true, sugar: true, sodium: true },
    }),
    db.stepEntry.findMany({ where: { userId: user.id, date: { gte: windowStart, lte: day } } }),
    db.workout.groupBy({
      by: ["date"],
      where: { userId: user.id, date: { gte: windowStart, lte: day } },
      _sum: { caloriesBurned: true },
      _count: true,
    }),
  ]);

  const points = weights.map((w) => ({ date: w.date, weightKg: w.weightKg }));
  const trend = weightTrend(points);
  const trendByDay = new Map(trend.map((t) => [t.date, t.trendKg]));
  const lastTrend = trend.length ? trend[trend.length - 1].trendKg : null;
  const workingWeightKg = lastTrend ?? 70;

  const stepsByDay = new Map(steps.map((s) => [s.date, s.steps]));
  const workoutsByDay = new Map(workouts.map((w) => [w.date, { kcal: w._sum.caloriesBurned ?? 0, count: w._count }]));
  const foodByDay = new Map(foods.map((f) => [f.date, f._sum]));

  const burnFor = (d: string) =>
    dailyBurn({
      sex: user.sex,
      weightKg: trendByDay.get(d) ?? workingWeightKg,
      heightCm: user.heightCm,
      age: ageOn(user.birthDate, d),
      steps: stepsByDay.get(d) ?? 0,
      workoutCalories: workoutsByDay.get(d)?.kcal ?? 0,
    });

  const calibrationDays = dayRange(addDays(day, -(CALIBRATION_WINDOW_DAYS - 1)), day).map((d) => ({
    date: d,
    intake: foodByDay.get(d)?.calories ?? null,
    estimatedBurn: burnFor(d).total,
  }));
  const calibration = calibrate(calibrationDays, points, day);

  const burn = burnFor(day);
  const t = targets({ sex: user.sex, weightKg: workingWeightKg, burn, factor: calibration.factor, goal: user.goal, weeklyRateKg: user.weeklyRateKg });

  const today = foodByDay.get(day);
  const eaten: Totals = {
    calories: today?.calories ?? 0,
    protein: today?.protein ?? 0,
    carbs: today?.carbs ?? 0,
    fat: today?.fat ?? 0,
    fiber: today?.fiber ?? 0,
    sugar: today?.sugar ?? 0,
    sodium: today?.sodium ?? 0,
  };

  const todayWeight = weights.find((w) => w.date === day);
  return {
    day,
    weightKg: todayWeight?.weightKg ?? (weights.length ? weights[weights.length - 1].weightKg : null),
    workingWeightKg,
    weighedInToday: !!todayWeight,
    steps: stepsByDay.get(day) ?? 0,
    workoutCalories: workoutsByDay.get(day)?.kcal ?? 0,
    workoutCount: workoutsByDay.get(day)?.count ?? 0,
    eaten,
    burn,
    calibration,
    targets: t,
    remaining: t.calories - eaten.calories,
    trend,
  };
}

/** Last N days of intake vs target for the weekly chart. */
export async function weekHistory(user: ProfiledUser, day: string, n = 7) {
  const from = addDays(day, -(n - 1));
  const foods = await db.foodEntry.groupBy({
    by: ["date"],
    where: { userId: user.id, date: { gte: from, lte: day } },
    _sum: { calories: true },
  });
  const byDay = new Map(foods.map((f) => [f.date, f._sum.calories ?? 0]));
  return dayRange(from, day).map((d) => ({ date: d, calories: byDay.get(d) ?? 0 }));
}
