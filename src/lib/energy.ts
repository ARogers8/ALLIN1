/**
 * The energy engine: how many calories a user burns and should eat.
 *
 * Instead of asking people to pick a subjective "activity level", burn is
 * built bottom-up from things they actually log:
 *
 *   daily burn = BMR (Mifflin-St Jeor)
 *              + baseline (digestion and minimal daily movement, 15% of BMR)
 *              + steps      (net calories above resting, scaled by body weight)
 *              + workouts   (net MET calories, scaled by body weight and duration)
 *
 * Once there are enough weigh-ins and food logs, the estimate is calibrated
 * against reality: if your weight trend says you are burning more (or less)
 * than the formula thinks, the target shifts to match.
 */

import { addDays, dayRange, daysBetween } from "./dates";

export type Sex = "MALE" | "FEMALE";
export type Goal = "CUT" | "MAINTAIN" | "BULK";

/** kcal stored in one kg of body-weight change (mixed fat and lean tissue). */
export const KCAL_PER_KG = 7700;
/** Baseline on top of BMR: thermic effect of food plus non-step daily movement. */
export const BASELINE_FACTOR = 0.15;
/** Net kcal per step per kg of body weight (≈ 360 kcal for 10k steps at 80 kg). */
export const STEP_KCAL_PER_KG = 0.00045;

export function bmr(p: { sex: Sex; weightKg: number; heightCm: number; age: number }): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === "MALE" ? base + 5 : base - 161;
}

export function stepCalories(steps: number, weightKg: number): number {
  return Math.max(0, steps) * weightKg * STEP_KCAL_PER_KG;
}

/** Net calories for an activity: (MET − 1) because resting burn is already in BMR. */
export function metCalories(met: number, weightKg: number, minutes: number): number {
  return Math.max(0, met - 1) * weightKg * (Math.max(0, minutes) / 60);
}

export interface DayBurn {
  bmr: number;
  baseline: number;
  steps: number;
  workouts: number;
  total: number;
}

export function dailyBurn(p: {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  age: number;
  steps: number;
  workoutCalories: number;
}): DayBurn {
  const b = bmr(p);
  const baseline = b * BASELINE_FACTOR;
  const steps = stepCalories(p.steps, p.weightKg);
  const workouts = Math.max(0, p.workoutCalories);
  return { bmr: b, baseline, steps, workouts, total: b + baseline + steps + workouts };
}

/** Daily kcal surplus (+) or deficit (−) needed to hit the weekly goal rate. */
export function goalDelta(goal: Goal, weeklyRateKg: number): number {
  if (goal === "MAINTAIN") return 0;
  const perDay = (Math.abs(weeklyRateKg) * KCAL_PER_KG) / 7;
  return goal === "CUT" ? -perDay : perDay;
}

export function calorieFloor(sex: Sex): number {
  return sex === "MALE" ? 1500 : 1200;
}

// ---------------------------------------------------------------------------
// Weight trend
// ---------------------------------------------------------------------------

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export interface TrendPoint {
  date: string;
  /** The actual scale reading, if there was one that day. */
  weightKg: number | null;
  /** Smoothed trend weight (exponential moving average, interpolated over gaps). */
  trendKg: number;
}

/**
 * Smooths daily weigh-ins so water and food swings don't hide the real trend.
 * Missing days are linearly interpolated before smoothing.
 */
export function weightTrend(points: WeightPoint[], alpha = 0.1): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];
  const byDate = new Map(sorted.map((p) => [p.date, p.weightKg]));
  const days = dayRange(sorted[0].date, sorted[sorted.length - 1].date);

  const out: TrendPoint[] = [];
  let prevIdx = 0;
  let trend = sorted[0].weightKg;
  for (const day of days) {
    let value = byDate.get(day);
    const actual = value ?? null;
    if (value === undefined) {
      while (prevIdx < sorted.length - 1 && sorted[prevIdx + 1].date < day) prevIdx++;
      const a = sorted[prevIdx];
      const b = sorted[prevIdx + 1];
      const t = daysBetween(a.date, day) / daysBetween(a.date, b.date);
      value = a.weightKg + (b.weightKg - a.weightKg) * t;
    }
    trend = trend + alpha * (value - trend);
    out.push({ date: day, weightKg: actual, trendKg: trend });
  }
  return out;
}

/** Least-squares slope of the trend line, in kg per day. */
export function trendSlope(trend: TrendPoint[]): number {
  const n = trend.length;
  if (n < 2) return 0;
  const xs = trend.map((_, i) => i);
  const ys = trend.map((p) => p.trendKg);
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

// ---------------------------------------------------------------------------
// Adaptive calibration
// ---------------------------------------------------------------------------

export interface CalibrationDay {
  date: string;
  /** Total kcal logged that day, or null if nothing was logged. */
  intake: number | null;
  /** Formula-estimated burn that day. */
  estimatedBurn: number;
}

export interface Calibration {
  /** Multiplier applied to the formula estimate (1 = formula is spot on). */
  factor: number;
  /** 0–1: how much the factor is trusted, based on how much data there is. */
  confidence: number;
  /** Burn implied by intake and weight change, if it could be computed. */
  observedBurn: number | null;
  loggedDays: number;
  weighInSpanDays: number;
  /** Plain-language status for the UI. */
  status: "learning" | "calibrated";
}

export const CALIBRATION_WINDOW_DAYS = 28;
const MIN_LOGGED_DAYS = 10;
const MIN_WEIGH_IN_SPAN = 14;
const FULL_CONFIDENCE_DAYS = 21;

/**
 * Compares what you ate with how your weight trend moved to learn your real burn.
 *   observed burn = average intake − (trend slope × 7700 kcal/kg)
 * The ratio of observed to estimated burn becomes a correction factor, blended
 * in gradually as more days are logged and clamped to ±25%.
 */
export function calibrate(days: CalibrationDay[], weights: WeightPoint[], endDay: string): Calibration {
  const start = addDays(endDay, -(CALIBRATION_WINDOW_DAYS - 1));
  const window = days.filter((d) => d.date >= start && d.date <= endDay);
  // Today is usually only partly logged, so leave it out.
  const logged = window.filter((d) => d.intake !== null && d.intake > 0 && d.date < endDay);
  const windowWeights = weights.filter((w) => w.date >= start && w.date <= endDay).sort((a, b) => a.date.localeCompare(b.date));
  const span = windowWeights.length >= 2 ? daysBetween(windowWeights[0].date, windowWeights[windowWeights.length - 1].date) : 0;

  const base: Calibration = { factor: 1, confidence: 0, observedBurn: null, loggedDays: logged.length, weighInSpanDays: span, status: "learning" };
  if (logged.length < MIN_LOGGED_DAYS || span < MIN_WEIGH_IN_SPAN) return base;

  // Seed the smoother with earlier weigh-ins so the window starts on a settled trend.
  const trend = weightTrend(weights.filter((w) => w.date <= endDay)).filter((p) => p.date >= windowWeights[0].date);
  const slope = trendSlope(trend);
  const avgIntake = logged.reduce((a, d) => a + (d.intake ?? 0), 0) / logged.length;
  const avgEstimated = logged.reduce((a, d) => a + d.estimatedBurn, 0) / logged.length;
  const observedBurn = avgIntake - slope * KCAL_PER_KG;
  if (avgEstimated <= 0 || observedBurn <= 0) return base;

  const ratio = Math.min(1.25, Math.max(0.75, observedBurn / avgEstimated));
  const confidence = Math.min(1, logged.length / FULL_CONFIDENCE_DAYS);
  return {
    factor: 1 + (ratio - 1) * confidence,
    confidence,
    observedBurn,
    loggedDays: logged.length,
    weighInSpanDays: span,
    status: "calibrated",
  };
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface Targets {
  burn: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goalDelta: number;
  floored: boolean;
}

/**
 * Calorie and macro targets for one day.
 * Protein: 2.0 g/kg when cutting (protects muscle), 1.8 g/kg otherwise.
 * Fat: 25% of calories. Carbs: the rest.
 */
export function targets(p: {
  sex: Sex;
  weightKg: number;
  burn: DayBurn;
  factor: number;
  goal: Goal;
  weeklyRateKg: number;
}): Targets {
  const burn = p.burn.total * p.factor;
  const delta = goalDelta(p.goal, p.weeklyRateKg);
  const raw = burn + delta;
  const floor = calorieFloor(p.sex);
  const calories = Math.max(floor, raw);
  const protein = p.weightKg * (p.goal === "CUT" ? 2.0 : 1.8);
  const fat = (calories * 0.25) / 9;
  const carbs = Math.max(0, (calories - protein * 4 - fat * 9) / 4);
  return { burn, calories, protein, carbs, fat, goalDelta: delta, floored: raw < floor };
}
