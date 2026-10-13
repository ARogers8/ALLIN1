"use client";

import { useActionState, useMemo, useState } from "react";
import { Check, Flame, Loader2, Minus, TrendingDown, TrendingUp } from "lucide-react";
import clsx from "clsx";
import { saveProfile, type ProfileState } from "@/app/actions/profile";
import { bmr, dailyBurn, goalDelta, calorieFloor } from "@/lib/energy";
import { CM_PER_IN, displayWeight, toKg, type UnitSystem } from "@/lib/units";
import { Button, Field, Input } from "./ui";

type Goal = "CUT" | "MAINTAIN" | "BULK";

export interface ProfileDefaults {
  name: string;
  sex: "MALE" | "FEMALE" | null;
  birthDate: string;
  heightCm: number | null;
  units: UnitSystem;
  goal: Goal;
  weeklyRateKg: number;
  goalWeightKg: number | null;
  weightKg: number | null;
}

const RATES: Record<UnitSystem, Record<"CUT" | "BULK", { value: number; label: string; note: string }[]>> = {
  IMPERIAL: {
    CUT: [
      { value: 0.5, label: "0.5 lb/wk", note: "Gentle" },
      { value: 1, label: "1 lb/wk", note: "Recommended" },
      { value: 1.5, label: "1.5 lb/wk", note: "Aggressive" },
      { value: 2, label: "2 lb/wk", note: "Very aggressive" },
    ],
    BULK: [
      { value: 0.25, label: "0.25 lb/wk", note: "Lean bulk" },
      { value: 0.5, label: "0.5 lb/wk", note: "Recommended" },
      { value: 1, label: "1 lb/wk", note: "Fast" },
    ],
  },
  METRIC: {
    CUT: [
      { value: 0.25, label: "0.25 kg/wk", note: "Gentle" },
      { value: 0.5, label: "0.5 kg/wk", note: "Recommended" },
      { value: 0.75, label: "0.75 kg/wk", note: "Aggressive" },
      { value: 1, label: "1 kg/wk", note: "Very aggressive" },
    ],
    BULK: [
      { value: 0.1, label: "0.1 kg/wk", note: "Lean bulk" },
      { value: 0.25, label: "0.25 kg/wk", note: "Recommended" },
      { value: 0.5, label: "0.5 kg/wk", note: "Fast" },
    ],
  },
};

function Segmented<T extends string>({ name, value, onChange, options }: { name: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-2xl border border-white/[0.06] bg-ink-900/80 p-1">
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx("h-9 rounded-xl text-sm font-medium transition", value === o.value ? "bg-white/[0.1] text-ink-100 shadow" : "text-ink-400 hover:text-ink-200")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ProfileForm({ defaults, onboarding }: { defaults: ProfileDefaults; onboarding: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, undefined);
  const [units, setUnits] = useState<UnitSystem>(defaults.units);
  const [sex, setSex] = useState<"MALE" | "FEMALE">(defaults.sex ?? "MALE");
  const [goal, setGoal] = useState<Goal>(defaults.goal);
  const [birthDate, setBirthDate] = useState(defaults.birthDate);

  const totalIn = defaults.heightCm ? Math.round(defaults.heightCm / CM_PER_IN) : null;
  const [heightFt, setHeightFt] = useState(totalIn ? String(Math.floor(totalIn / 12)) : "");
  const [heightIn, setHeightIn] = useState(totalIn ? String(totalIn % 12) : "");
  const [heightCm, setHeightCm] = useState(defaults.heightCm ? String(Math.round(defaults.heightCm)) : "");
  const [weight, setWeight] = useState(defaults.weightKg ? String(displayWeight(defaults.weightKg, defaults.units)) : "");
  const [goalWeight, setGoalWeight] = useState(defaults.goalWeightKg ? String(displayWeight(defaults.goalWeightKg, defaults.units)) : "");

  const defaultRate = (g: Goal, u: UnitSystem) => (g === "MAINTAIN" ? 0 : RATES[u][g].find((r) => r.note === "Recommended")!.value);
  const initialRate =
    defaults.goal !== "MAINTAIN" && defaults.weeklyRateKg > 0 ? displayWeight(defaults.weeklyRateKg, defaults.units, 2) : defaultRate(defaults.goal, defaults.units);
  const [rate, setRate] = useState<number>(initialRate);

  function switchUnits(u: UnitSystem) {
    if (u === units) return;
    const w = parseFloat(weight);
    if (w) setWeight(String(displayWeight(toKg(w, units), u)));
    const gw = parseFloat(goalWeight);
    if (gw) setGoalWeight(String(displayWeight(toKg(gw, units), u)));
    const cm = units === "METRIC" ? parseFloat(heightCm) : ((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * CM_PER_IN;
    if (cm) {
      const inches = Math.round(cm / CM_PER_IN);
      setHeightFt(String(Math.floor(inches / 12)));
      setHeightIn(String(inches % 12));
      setHeightCm(String(Math.round(cm)));
    }
    setUnits(u);
    if (goal !== "MAINTAIN") setRate(defaultRate(goal, u));
  }

  function switchGoal(g: Goal) {
    setGoal(g);
    setRate(defaultRate(g, units));
  }

  // Live preview of the starting target, assuming a typical 6,000-step day and no workout.
  const preview = useMemo(() => {
    const kg = toKg(parseFloat(weight), units);
    const cm = units === "METRIC" ? parseFloat(heightCm) : ((parseFloat(heightFt) || 0) * 12 + (parseFloat(heightIn) || 0)) * CM_PER_IN;
    const age = birthDate ? (Date.now() - Date.parse(birthDate)) / (365.25 * 86_400_000) : NaN;
    if (!(kg > 25) || !(cm > 100) || !(age > 10)) return null;
    const burn = dailyBurn({ sex, weightKg: kg, heightCm: cm, age, steps: 6000, workoutCalories: 0 });
    const target = Math.max(calorieFloor(sex), burn.total + goalDelta(goal, toKg(rate, units)));
    return { bmr: bmr({ sex, weightKg: kg, heightCm: cm, age }), burn: burn.total, target };
  }, [weight, heightCm, heightFt, heightIn, birthDate, sex, goal, rate, units]);

  const wu = units === "IMPERIAL" ? "lb" : "kg";

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-sm font-medium text-ink-300">About you</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input name="name" defaultValue={defaults.name} required />
            </Field>
            <Field label="Units">
              <Segmented name="units" value={units} onChange={switchUnits} options={[{ value: "IMPERIAL", label: "lb · ft" }, { value: "METRIC", label: "kg · cm" }]} />
            </Field>
            <Field label="Sex" hint="Used for your metabolism">
              <Segmented name="sex" value={sex} onChange={setSex} options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }]} />
            </Field>
            <Field label="Birthday">
              <Input name="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </Field>
            <Field label="Height">
              {units === "IMPERIAL" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Input name="heightFt" inputMode="numeric" type="number" value={heightFt} onChange={(e) => setHeightFt(e.target.value)} placeholder="5" required />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">ft</span>
                  </div>
                  <div className="relative">
                    <Input name="heightIn" inputMode="numeric" type="number" value={heightIn} onChange={(e) => setHeightIn(e.target.value)} placeholder="10" />
                    <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">in</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input name="heightCm" inputMode="numeric" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} placeholder="178" required />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">cm</span>
                </div>
              )}
            </Field>
            <Field label={onboarding ? "Current weight" : "Today's weight"} hint={onboarding ? undefined : "Optional"}>
              <div className="relative">
                <Input name="weight" inputMode="decimal" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={units === "IMPERIAL" ? "180" : "82"} required={onboarding} />
                <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">{wu}</span>
              </div>
            </Field>
          </div>
        </section>

        <section className="card space-y-5 p-5 sm:p-6">
          <h2 className="text-sm font-medium text-ink-300">Your goal</h2>
          <input type="hidden" name="goal" value={goal} />
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                { g: "CUT", title: "Cut", sub: "Lose fat, keep muscle", icon: TrendingDown, color: "text-sky" },
                { g: "MAINTAIN", title: "Maintain", sub: "Stay where you are", icon: Minus, color: "text-violet" },
                { g: "BULK", title: "Bulk", sub: "Build muscle", icon: TrendingUp, color: "text-volt" },
              ] as const
            ).map(({ g, title, sub, icon: Icon, color }) => (
              <button
                key={g}
                type="button"
                onClick={() => switchGoal(g)}
                className={clsx(
                  "relative rounded-2xl border p-4 text-left transition",
                  goal === g ? "border-volt/50 bg-volt/[0.06]" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]",
                )}
              >
                {goal === g && (
                  <span className="absolute top-3 right-3 grid size-5 place-items-center rounded-full bg-volt text-ink-950">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
                <Icon className={clsx("size-5", color)} />
                <div className="mt-3 font-medium">{title}</div>
                <div className="text-xs text-ink-500">{sub}</div>
              </button>
            ))}
          </div>

          {goal !== "MAINTAIN" ? (
            <>
              <input type="hidden" name="weeklyRate" value={rate} />
              <div>
                <div className="mb-2 text-[13px] font-medium text-ink-300">How fast?</div>
                <div className="flex flex-wrap gap-2">
                  {RATES[units][goal].map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setRate(r.value)}
                      className={clsx(
                        "rounded-2xl border px-4 py-2.5 text-left transition",
                        rate === r.value ? "border-volt/50 bg-volt/[0.08] text-ink-100" : "border-white/[0.06] text-ink-300 hover:border-white/[0.12]",
                      )}
                    >
                      <div className="text-sm font-medium">{r.label}</div>
                      <div className="text-[11px] text-ink-500">{r.note}</div>
                    </button>
                  ))}
                </div>
              </div>
              <Field label="Goal weight" hint="Optional" className="max-w-xs">
                <div className="relative">
                  <Input name="goalWeight" inputMode="decimal" type="number" step="0.1" value={goalWeight} onChange={(e) => setGoalWeight(e.target.value)} />
                  <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">{wu}</span>
                </div>
              </Field>
            </>
          ) : (
            <input type="hidden" name="weeklyRate" value={0} />
          )}
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
        <div className="card overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-ink-300">
            <Flame className="size-4 text-flame" /> Starting estimate
          </div>
          {preview ? (
            <>
              <div className="mt-4 text-4xl font-semibold tracking-tight tabular">
                {Math.round(preview.target).toLocaleString()} <span className="text-base font-normal text-ink-400">kcal/day</span>
              </div>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between text-ink-400">
                  <dt>Resting burn (BMR)</dt>
                  <dd className="tabular text-ink-200">{Math.round(preview.bmr).toLocaleString()}</dd>
                </div>
                <div className="flex justify-between text-ink-400">
                  <dt>Typical day, 6k steps</dt>
                  <dd className="tabular text-ink-200">{Math.round(preview.burn).toLocaleString()}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-ink-500">
                No guessing an &ldquo;activity level&rdquo;. Your real target moves every day with the steps and workouts you log, and it gets corrected by your weigh-in trend
                after a couple of weeks.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-500">Fill in your details to see your starting calorie target.</p>
          )}
        </div>
        {state?.error && <p className="rounded-2xl bg-ember/10 px-4 py-3 text-sm text-ember">{state.error}</p>}
        {state?.ok && <p className="rounded-2xl bg-volt/10 px-4 py-3 text-sm text-volt">Saved. Your targets are updated.</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : onboarding ? "Start tracking" : "Save changes"}
        </Button>
      </aside>
    </form>
  );
}
