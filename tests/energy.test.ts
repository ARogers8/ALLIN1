import { describe, expect, it } from "vitest";
import { addDays, dayRange } from "@/lib/dates";
import { bmr, calibrate, dailyBurn, goalDelta, KCAL_PER_KG, targets, trendSlope, weightTrend } from "@/lib/energy";
import { workoutCalories } from "@/lib/exercises";
import { normalizeKey } from "@/lib/text";

describe("bmr (Mifflin-St Jeor)", () => {
  it("matches the published formula", () => {
    expect(bmr({ sex: "MALE", weightKg: 80, heightCm: 180, age: 30 })).toBe(1780);
    expect(bmr({ sex: "FEMALE", weightKg: 60, heightCm: 165, age: 30 })).toBeCloseTo(1320.25);
  });
});

describe("dailyBurn", () => {
  it("adds steps and workouts on top of BMR and baseline", () => {
    const rest = dailyBurn({ sex: "MALE", weightKg: 80, heightCm: 180, age: 30, steps: 0, workoutCalories: 0 });
    const active = dailyBurn({ sex: "MALE", weightKg: 80, heightCm: 180, age: 30, steps: 10_000, workoutCalories: 300 });
    expect(rest.total).toBeCloseTo(1780 * 1.15);
    expect(active.steps).toBeCloseTo(360);
    expect(active.total - rest.total).toBeCloseTo(660);
  });
});

describe("goalDelta", () => {
  it("turns a weekly rate into a daily deficit or surplus", () => {
    expect(goalDelta("CUT", 0.5)).toBeCloseTo(-550);
    expect(goalDelta("BULK", 0.25)).toBeCloseTo(275);
    expect(goalDelta("MAINTAIN", 1)).toBe(0);
  });
});

describe("targets", () => {
  it("never goes below a safe floor", () => {
    const burn = dailyBurn({ sex: "FEMALE", weightKg: 50, heightCm: 155, age: 40, steps: 0, workoutCalories: 0 });
    const t = targets({ sex: "FEMALE", weightKg: 50, burn, factor: 1, goal: "CUT", weeklyRateKg: 1 });
    expect(t.calories).toBe(1200);
    expect(t.floored).toBe(true);
  });

  it("splits macros so they add back up to the calorie target", () => {
    const burn = dailyBurn({ sex: "MALE", weightKg: 80, heightCm: 180, age: 30, steps: 8000, workoutCalories: 250 });
    const t = targets({ sex: "MALE", weightKg: 80, burn, factor: 1, goal: "BULK", weeklyRateKg: 0.25 });
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeCloseTo(t.calories, 0);
    expect(t.protein).toBeCloseTo(144);
  });
});

describe("weight trend", () => {
  it("interpolates gaps and smooths noise", () => {
    const trend = weightTrend([
      { date: "2026-01-01", weightKg: 80 },
      { date: "2026-01-03", weightKg: 82 },
    ]);
    expect(trend.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
    expect(trend[1].weightKg).toBeNull();
    expect(trend[2].trendKg).toBeGreaterThan(80);
    expect(trend[2].trendKg).toBeLessThan(82);
  });

  it("measures a steady loss as a negative slope", () => {
    const days = dayRange("2026-01-01", "2026-01-29");
    const trend = weightTrend(days.map((d, i) => ({ date: d, weightKg: 90 - i * 0.1 })));
    expect(trendSlope(trend.slice(-14))).toBeCloseTo(-0.1, 1);
  });
});

describe("calibrate", () => {
  const end = "2026-03-01";
  const days = dayRange(addDays(end, -27), end);

  it("stays at the formula while there is too little data", () => {
    const c = calibrate(days.slice(-5).map((d) => ({ date: d, intake: 2000, estimatedBurn: 2500 })), [], end);
    expect(c.status).toBe("learning");
    expect(c.factor).toBe(1);
  });

  it("learns a faster metabolism when weight drops more than expected", () => {
    // Eats 2,500 a day against an estimated burn of 2,500, yet loses 0.1 kg/day:
    // real burn ≈ 2,500 + 770 = 3,270, so the factor should go well above 1.
    const weights = dayRange(addDays(end, -60), end).map((d, i) => ({ date: d, weightKg: 95 - i * 0.1 }));
    const c = calibrate(
      days.map((d) => ({ date: d, intake: 2500, estimatedBurn: 2500 })),
      weights,
      end,
    );
    expect(c.status).toBe("calibrated");
    expect(c.observedBurn!).toBeGreaterThan(2500 + 0.08 * KCAL_PER_KG);
    expect(c.factor).toBeGreaterThan(1.2);
    expect(c.factor).toBeLessThanOrEqual(1.25);
  });

  it("learns a slower metabolism when weight holds on a planned deficit", () => {
    const weights = dayRange(addDays(end, -60), end).map((d) => ({ date: d, weightKg: 80 }));
    const c = calibrate(
      days.map((d) => ({ date: d, intake: 2000, estimatedBurn: 2400 })),
      weights,
      end,
    );
    expect(c.factor).toBeLessThan(0.9);
  });
});

describe("workoutCalories", () => {
  it("estimates strength time from sets and counts cardio minutes directly", () => {
    const { calories, minutes } = workoutCalories(
      [
        { met: 6, kind: "STRENGTH", sets: [{}, {}, {}, {}] },
        { met: 9.8, kind: "CARDIO", sets: [{ durationMin: 20 }] },
      ],
      80,
    );
    expect(minutes).toBe(30);
    // (6-1)*80*(10/60) + (9.8-1)*80*(20/60)
    expect(calories).toBeCloseTo(66.67 + 234.67, 1);
  });

  it("stretches strength work to fit a user-entered session length", () => {
    const { calories, minutes } = workoutCalories([{ met: 6, kind: "STRENGTH", sets: [{}, {}] }], 80, 60);
    expect(minutes).toBe(60);
    expect(calories).toBeCloseTo(400);
  });
});

describe("normalizeKey", () => {
  it("treats the same food typed differently as one", () => {
    expect(normalizeKey('A 12" Philly Cheesesteak!')).toBe(normalizeKey("12 inch philly cheesesteak"));
    expect(normalizeKey("I had the chicken bowl from Chipotle")).toBe(normalizeKey("chicken bowl chipotle"));
  });
});
