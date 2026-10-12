import { metCalories } from "./energy";

export type ExerciseKind = "STRENGTH" | "CARDIO";

export interface ExerciseDef {
  name: string;
  kind: ExerciseKind;
  /** Metabolic equivalent from the Compendium of Physical Activities. */
  met: number;
  group: string;
}

/** Starter library. Anything a user types that isn't here is remembered as their own exercise. */
export const EXERCISE_LIBRARY: ExerciseDef[] = [
  // Chest
  { name: "Bench Press", kind: "STRENGTH", met: 6, group: "Chest" },
  { name: "Incline Bench Press", kind: "STRENGTH", met: 6, group: "Chest" },
  { name: "Dumbbell Bench Press", kind: "STRENGTH", met: 6, group: "Chest" },
  { name: "Incline Dumbbell Press", kind: "STRENGTH", met: 6, group: "Chest" },
  { name: "Chest Fly", kind: "STRENGTH", met: 5, group: "Chest" },
  { name: "Push-Up", kind: "STRENGTH", met: 5, group: "Chest" },
  { name: "Dip", kind: "STRENGTH", met: 5.5, group: "Chest" },
  // Back
  { name: "Deadlift", kind: "STRENGTH", met: 6, group: "Back" },
  { name: "Pull-Up", kind: "STRENGTH", met: 6, group: "Back" },
  { name: "Lat Pulldown", kind: "STRENGTH", met: 5, group: "Back" },
  { name: "Barbell Row", kind: "STRENGTH", met: 6, group: "Back" },
  { name: "Seated Cable Row", kind: "STRENGTH", met: 5, group: "Back" },
  { name: "Dumbbell Row", kind: "STRENGTH", met: 5, group: "Back" },
  // Legs
  { name: "Squat", kind: "STRENGTH", met: 6, group: "Legs" },
  { name: "Front Squat", kind: "STRENGTH", met: 6, group: "Legs" },
  { name: "Leg Press", kind: "STRENGTH", met: 5.5, group: "Legs" },
  { name: "Romanian Deadlift", kind: "STRENGTH", met: 6, group: "Legs" },
  { name: "Lunge", kind: "STRENGTH", met: 5, group: "Legs" },
  { name: "Bulgarian Split Squat", kind: "STRENGTH", met: 5.5, group: "Legs" },
  { name: "Leg Extension", kind: "STRENGTH", met: 4, group: "Legs" },
  { name: "Leg Curl", kind: "STRENGTH", met: 4, group: "Legs" },
  { name: "Calf Raise", kind: "STRENGTH", met: 3.5, group: "Legs" },
  { name: "Hip Thrust", kind: "STRENGTH", met: 5, group: "Legs" },
  // Shoulders & arms
  { name: "Overhead Press", kind: "STRENGTH", met: 6, group: "Shoulders" },
  { name: "Dumbbell Shoulder Press", kind: "STRENGTH", met: 5.5, group: "Shoulders" },
  { name: "Lateral Raise", kind: "STRENGTH", met: 3.5, group: "Shoulders" },
  { name: "Face Pull", kind: "STRENGTH", met: 3.5, group: "Shoulders" },
  { name: "Bicep Curl", kind: "STRENGTH", met: 3.5, group: "Arms" },
  { name: "Hammer Curl", kind: "STRENGTH", met: 3.5, group: "Arms" },
  { name: "Tricep Pushdown", kind: "STRENGTH", met: 3.5, group: "Arms" },
  { name: "Skull Crusher", kind: "STRENGTH", met: 3.5, group: "Arms" },
  // Core
  { name: "Plank", kind: "STRENGTH", met: 3.8, group: "Core" },
  { name: "Crunch", kind: "STRENGTH", met: 3.8, group: "Core" },
  { name: "Hanging Leg Raise", kind: "STRENGTH", met: 4, group: "Core" },
  // Cardio
  { name: "Running", kind: "CARDIO", met: 9.8, group: "Cardio" },
  { name: "Jogging", kind: "CARDIO", met: 7, group: "Cardio" },
  { name: "Incline Treadmill Walk", kind: "CARDIO", met: 6, group: "Cardio" },
  { name: "Cycling", kind: "CARDIO", met: 7.5, group: "Cardio" },
  { name: "Stationary Bike", kind: "CARDIO", met: 6.8, group: "Cardio" },
  { name: "Rowing Machine", kind: "CARDIO", met: 7, group: "Cardio" },
  { name: "Elliptical", kind: "CARDIO", met: 5, group: "Cardio" },
  { name: "Stair Climber", kind: "CARDIO", met: 9, group: "Cardio" },
  { name: "Swimming", kind: "CARDIO", met: 7, group: "Cardio" },
  { name: "Jump Rope", kind: "CARDIO", met: 11, group: "Cardio" },
  { name: "HIIT", kind: "CARDIO", met: 8, group: "Cardio" },
  { name: "Basketball", kind: "CARDIO", met: 6.5, group: "Sports" },
  { name: "Soccer", kind: "CARDIO", met: 7, group: "Sports" },
  { name: "Hiking", kind: "CARDIO", met: 6, group: "Cardio" },
];

/** Typical time per strength set including rest, used when no duration is entered. */
export const MINUTES_PER_STRENGTH_SET = 2.5;

export interface SetInput {
  reps?: number | null;
  weightKg?: number | null;
  durationMin?: number | null;
  distanceKm?: number | null;
}

export interface ExerciseInput {
  met: number;
  kind: ExerciseKind;
  sets: SetInput[];
}

/** Minutes an exercise took: cardio uses entered durations, strength uses sets × time per set. */
export function exerciseMinutes(ex: ExerciseInput): number {
  if (ex.kind === "CARDIO") return ex.sets.reduce((a, s) => a + (s.durationMin ?? 0), 0);
  return ex.sets.length * MINUTES_PER_STRENGTH_SET;
}

/**
 * Net calories for a workout. If the user entered a total duration for a
 * strength session, it is spread across exercises in proportion to their sets.
 */
export function workoutCalories(exercises: ExerciseInput[], weightKg: number, totalMinutes?: number | null): { calories: number; minutes: number } {
  const estimated = exercises.map(exerciseMinutes);
  const estimatedTotal = estimated.reduce((a, b) => a + b, 0);
  const strengthEstimated = exercises.reduce((a, ex, i) => a + (ex.kind === "STRENGTH" ? estimated[i] : 0), 0);
  const cardioMinutes = estimatedTotal - strengthEstimated;

  // A user-entered total overrides the strength estimate (cardio durations are explicit).
  const strengthScale = totalMinutes && totalMinutes > cardioMinutes && strengthEstimated > 0 ? (totalMinutes - cardioMinutes) / strengthEstimated : 1;

  let calories = 0;
  exercises.forEach((ex, i) => {
    const mins = ex.kind === "STRENGTH" ? estimated[i] * strengthScale : estimated[i];
    calories += metCalories(ex.met, weightKg, mins);
  });
  const minutes = totalMinutes && totalMinutes > 0 ? totalMinutes : estimatedTotal;
  return { calories, minutes };
}

export function findLibraryExercise(name: string): ExerciseDef | undefined {
  const k = name.trim().toLowerCase();
  return EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === k);
}

/** Volume (reps × weight) across strength sets, for progress display. */
export function setVolume(sets: SetInput[]): number {
  return sets.reduce((a, s) => a + (s.reps ?? 0) * (s.weightKg ?? 0), 0);
}
