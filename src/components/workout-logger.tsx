"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Dumbbell, Flame, HeartPulse, Loader2, Plus, Search, Timer, X } from "lucide-react";
import clsx from "clsx";
import { saveWorkout } from "@/app/actions/logs";
import { EXERCISE_LIBRARY, workoutCalories, type ExerciseKind } from "@/lib/exercises";
import type { UnitSystem } from "@/lib/units";
import { Button, Input } from "./ui";

export interface KnownExercise {
  name: string;
  kind: ExerciseKind;
  met: number;
  /** Sets from the last time this exercise was done, in display units. */
  lastSets: SetDraft[];
  lastDate?: string;
}

export interface SetDraft {
  reps?: string;
  weight?: string;
  durationMin?: string;
  distance?: string;
}

export interface ExerciseDraft {
  name: string;
  kind: ExerciseKind;
  met: number;
  sets: SetDraft[];
  lastSets?: SetDraft[];
}

const num = (s?: string) => {
  const n = parseFloat(s ?? "");
  return Number.isFinite(n) ? n : null;
};

export function WorkoutLogger({
  date,
  units,
  bodyKg,
  known,
  initial,
}: {
  date: string;
  units: UnitSystem;
  bodyKg: number;
  known: KnownExercise[];
  initial?: { name: string; exercises: ExerciseDraft[] };
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [minutes, setMinutes] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>(initial?.exercises ?? []);
  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const wu = units === "IMPERIAL" ? "lb" : "kg";
  const du = units === "IMPERIAL" ? "mi" : "km";

  const options = useMemo(() => {
    const byName = new Map<string, KnownExercise & { mine: boolean }>();
    for (const k of known) byName.set(k.name.toLowerCase(), { ...k, mine: true });
    for (const l of EXERCISE_LIBRARY) if (!byName.has(l.name.toLowerCase())) byName.set(l.name.toLowerCase(), { ...l, lastSets: [], mine: false });
    const q = query.trim().toLowerCase();
    const all = [...byName.values()];
    const filtered = q ? all.filter((o) => o.name.toLowerCase().includes(q)) : all.filter((o) => o.mine).concat(all.filter((o) => !o.mine));
    return filtered.slice(0, 12);
  }, [known, query]);

  function add(o: { name: string; kind: ExerciseKind; met: number; lastSets: SetDraft[] }) {
    const sets = o.lastSets.length ? o.lastSets.map((s) => ({ ...s })) : [o.kind === "CARDIO" ? { durationMin: "" } : { reps: "", weight: "" }];
    setExercises([...exercises, { name: o.name, kind: o.kind, met: o.met, sets, lastSets: o.lastSets }]);
    setQuery("");
    setPicking(false);
  }

  function addCustom(kind: ExerciseKind) {
    const n = query.trim();
    if (!n) return;
    add({ name: n, kind, met: kind === "CARDIO" ? 7 : 5, lastSets: [] });
  }

  function update(i: number, fn: (e: ExerciseDraft) => ExerciseDraft) {
    setExercises(exercises.map((e, j) => (j === i ? fn(e) : e)));
  }

  const estimate = useMemo(() => {
    const ex = exercises.map((e) => ({
      met: e.met,
      kind: e.kind,
      sets: e.sets.map((s) => ({ reps: num(s.reps), weightKg: num(s.weight), durationMin: num(s.durationMin) })),
    }));
    return workoutCalories(ex, bodyKg, num(minutes));
  }, [exercises, bodyKg, minutes]);

  function submit() {
    setError(null);
    start(async () => {
      const res = await saveWorkout({
        date,
        name,
        totalMinutes: num(minutes),
        exercises: exercises.map((e) => ({
          name: e.name,
          kind: e.kind,
          sets: e.sets
            .map((s) => ({ reps: num(s.reps), weight: num(s.weight), durationMin: num(s.durationMin), distance: num(s.distance) }))
            .filter((s) => s.reps != null || s.weight != null || s.durationMin != null || s.distance != null)
            .map((s) => ({ ...s, reps: s.reps != null ? Math.round(s.reps) : null })),
        })).filter((e) => e.sets.length > 0),
      });
      if (res && "error" in res) setError(res.error ?? "Couldn't save");
      else if (res?.ok) {
        setSaved(Math.round(res.calories));
        setExercises([]);
        setName("");
        setMinutes("");
        setPicking(true);
        router.replace(`/activity${date ? `?date=${date}` : ""}`, { scroll: false });
        setTimeout(() => setSaved(null), 3000);
      }
    });
  }

  return (
    <div className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -top-24 -left-24 size-64 rounded-full bg-flame/10 blur-3xl" />
      <div className="relative mb-4 flex flex-wrap items-center gap-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workout name (optional), e.g. Push day" className="flex-1 basis-56" />
        <div className="relative w-36">
          <Input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" placeholder="Duration" className="pr-12" />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-ink-500">min</span>
        </div>
      </div>

      <div className="relative space-y-3">
        {exercises.map((e, i) => (
          <div key={i} className="animate-rise rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {e.kind === "CARDIO" ? <HeartPulse className="size-4 text-ember" /> : <Dumbbell className="size-4 text-volt" />}
                <span className="font-medium">{e.name}</span>
              </div>
              <button onClick={() => setExercises(exercises.filter((_, j) => j !== i))} className="text-ink-500 hover:text-ember" aria-label="Remove exercise">
                <X className="size-4" />
              </button>
            </div>
            {e.lastSets?.length ? (
              <div className="mb-2 text-xs text-ink-500">
                Last time:{" "}
                {e.lastSets
                  .map((s) => (e.kind === "CARDIO" ? `${s.durationMin ?? "?"} min${s.distance ? ` · ${s.distance} ${du}` : ""}` : `${s.reps ?? "?"}×${s.weight || "BW"}`))
                  .join(", ")}
              </div>
            ) : null}
            <div className="space-y-1.5">
              {e.sets.map((s, j) => (
                <div key={j} className="flex items-center gap-2">
                  <span className="w-6 text-center text-xs font-medium text-ink-500">{j + 1}</span>
                  {e.kind === "STRENGTH" ? (
                    <>
                      <SetInput value={s.reps} onChange={(v) => update(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, reps: v } : y)) }))} unit="reps" />
                      <span className="text-ink-600">×</span>
                      <SetInput value={s.weight} onChange={(v) => update(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, weight: v } : y)) }))} unit={wu} decimal />
                    </>
                  ) : (
                    <>
                      <SetInput value={s.durationMin} onChange={(v) => update(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, durationMin: v } : y)) }))} unit="min" decimal />
                      <SetInput value={s.distance} onChange={(v) => update(i, (x) => ({ ...x, sets: x.sets.map((y, k) => (k === j ? { ...y, distance: v } : y)) }))} unit={du} decimal />
                    </>
                  )}
                  {e.sets.length > 1 && (
                    <button onClick={() => update(i, (x) => ({ ...x, sets: x.sets.filter((_, k) => k !== j) }))} className="text-ink-600 hover:text-ember" aria-label="Remove set">
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => update(i, (x) => ({ ...x, sets: [...x.sets, { ...x.sets[x.sets.length - 1] }] }))}
              className="mt-2 ml-8 flex items-center gap-1 text-xs font-medium text-ink-400 hover:text-volt"
            >
              <Plus className="size-3.5" /> Add {e.kind === "CARDIO" ? "interval" : "set"}
            </button>
          </div>
        ))}

        {picking ? (
          <div className="rounded-2xl border border-white/[0.06] bg-ink-900/60 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-500" />
              <Input autoFocus={exercises.length > 0} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search exercises or type your own" className="pl-10" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {options.map((o) => (
                <button
                  key={o.name}
                  onClick={() => add(o)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-sm transition hover:border-volt/50 hover:text-ink-100",
                    o.mine ? "border-volt/25 bg-volt/[0.06] text-ink-100" : "border-white/[0.08] text-ink-300",
                  )}
                >
                  {o.name}
                </button>
              ))}
              {query.trim() && !options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase()) && (
                <>
                  <button onClick={() => addCustom("STRENGTH")} className="rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-ink-300 hover:border-volt/50">
                    + “{query.trim()}” (weights)
                  </button>
                  <button onClick={() => addCustom("CARDIO")} className="rounded-full border border-dashed border-white/20 px-3 py-1.5 text-sm text-ink-300 hover:border-volt/50">
                    + “{query.trim()}” (cardio)
                  </button>
                </>
              )}
            </div>
            {exercises.length > 0 && (
              <button onClick={() => setPicking(false)} className="mt-2 text-xs text-ink-500 hover:text-ink-200">
                Done adding
              </button>
            )}
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setPicking(true)} className="w-full">
            <Plus className="size-4" /> Add exercise
          </Button>
        )}
      </div>

      {exercises.length > 0 && (
        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4">
          <div className="flex items-center gap-4 text-sm text-ink-400">
            <span className="flex items-center gap-1.5">
              <Flame className="size-4 text-flame" /> <span className="tabular font-semibold text-ink-100">{Math.round(estimate.calories)}</span> kcal
            </span>
            <span className="flex items-center gap-1.5">
              <Timer className="size-4" /> <span className="tabular">{Math.round(estimate.minutes)}</span> min
            </span>
          </div>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save workout
          </Button>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-ember/10 px-3 py-2 text-sm text-ember">{error}</p>}
      {saved != null && (
        <div className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 animate-rise items-center gap-2 rounded-full bg-ink-100 px-4 py-2 text-sm font-medium text-ink-950 shadow-2xl lg:bottom-8">
          <Check className="size-4" strokeWidth={3} /> Workout saved · {saved} kcal
        </div>
      )}
    </div>
  );
}

function SetInput({ value, onChange, unit, decimal }: { value?: string; onChange: (v: string) => void; unit: string; decimal?: boolean }) {
  return (
    <div className="relative flex-1">
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        inputMode={decimal ? "decimal" : "numeric"}
        className="h-10 w-full rounded-xl border border-white/[0.06] bg-ink-900/80 pr-11 pl-3 text-[15px] tabular outline-none transition focus:border-volt/60"
      />
      <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-ink-500">{unit}</span>
    </div>
  );
}
