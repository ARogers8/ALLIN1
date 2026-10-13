import Link from "next/link";
import { Dumbbell, Flame, Footprints, HeartPulse, Repeat2, Timer } from "lucide-react";
import { requireUser, userToday } from "@/lib/auth";
import { db } from "@/lib/db";
import { daySummary } from "@/lib/summary";
import { pageDay } from "@/lib/page-day";
import { formatDay, relativeDayLabel } from "@/lib/dates";
import { displayWeight, weightUnit } from "@/lib/units";
import { DateNav } from "@/components/date-nav";
import { QuickNumber } from "@/components/quick-number";
import { WorkoutLogger, type ExerciseDraft, type KnownExercise, type SetDraft } from "@/components/workout-logger";
import { DeleteWorkoutButton } from "@/components/workout-actions";
import { Card, CardTitle, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Activity" };

type SetRow = { reps: number | null; weightKg: number | null; durationMin: number | null; distanceKm: number | null };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ date?: string; repeat?: string }> }) {
  const user = await requireUser();
  const today = await userToday();
  const sp = await searchParams;
  const day = pageDay(sp.date, today);
  const imperial = user.units === "IMPERIAL";
  const wu = weightUnit(user.units);

  const toDraft = (s: SetRow): SetDraft => ({
    reps: s.reps != null ? String(s.reps) : "",
    weight: s.weightKg != null ? String(displayWeight(s.weightKg, user.units, 1)) : "",
    durationMin: s.durationMin != null ? String(Math.round(s.durationMin * 10) / 10) : "",
    distance: s.distanceKm != null ? String(Math.round((imperial ? s.distanceKm / 1.609344 : s.distanceKm) * 100) / 100) : "",
  });

  const [summary, recent, exercises, repeat] = await Promise.all([
    daySummary(user, day),
    db.workout.findMany({
      where: { userId: user.id },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 10,
      include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } },
    }),
    db.exercise.findMany({
      where: { userId: user.id },
      include: { sets: { orderBy: { workout: { date: "desc" } }, take: 30, include: { workout: { select: { id: true, date: true } } } } },
    }),
    sp.repeat
      ? db.workout.findFirst({ where: { id: sp.repeat, userId: user.id }, include: { sets: { include: { exercise: true }, orderBy: { order: "asc" } } } })
      : null,
  ]);

  // Remember each exercise's most recent sets so they prefill next time.
  const known: KnownExercise[] = exercises.map((e) => {
    const lastWorkoutId = e.sets[0]?.workout.id;
    const lastSets = e.sets.filter((s) => s.workout.id === lastWorkoutId).sort((a, b) => a.order - b.order);
    return { name: e.name, kind: e.kind, met: e.met, lastSets: lastSets.map(toDraft), lastDate: e.sets[0]?.workout.date };
  });
  known.sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? ""));

  const groupSets = (sets: (SetRow & { exercise: { name: string; kind: "STRENGTH" | "CARDIO"; met: number } })[]) => {
    const groups: { name: string; kind: "STRENGTH" | "CARDIO"; met: number; sets: SetRow[] }[] = [];
    for (const s of sets) {
      const last = groups[groups.length - 1];
      if (last && last.name === s.exercise.name) last.sets.push(s);
      else groups.push({ name: s.exercise.name, kind: s.exercise.kind, met: s.exercise.met, sets: [s] });
    }
    return groups;
  };

  const initial = repeat
    ? {
        name: repeat.name,
        exercises: groupSets(repeat.sets).map<ExerciseDraft>((g) => ({ name: g.name, kind: g.kind, met: g.met, sets: g.sets.map(toDraft), lastSets: g.sets.map(toDraft) })),
      }
    : undefined;

  const todays = recent.filter((w) => w.date === day);

  return (
    <>
      <PageHeader title="Activity" subtitle="Log your steps and every set. Calories burned feed straight into your target." action={<DateNav day={day} today={today} basePath="/activity" />} />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          <WorkoutLogger key={`${day}-${sp.repeat ?? ""}`} date={day} units={user.units} bodyKg={summary.workingWeightKg} known={known} initial={initial} />

          <Card>
            <CardTitle icon={<Dumbbell className="size-4" />}>History</CardTitle>
            {recent.length === 0 ? (
              <EmptyState icon={<Dumbbell className="size-5" />} title="No workouts yet">
                Add your first one above. Every exercise you log is remembered with your last sets, so next time is one tap.
              </EmptyState>
            ) : (
              <ul className="space-y-2.5">
                {recent.map((w) => (
                  <li key={w.id} className="group rounded-2xl border border-white/[0.05] bg-white/[0.02] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{w.name}</div>
                        <div className="text-xs text-ink-500">{relativeDayLabel(w.date, today)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="mr-2 flex items-center gap-1 text-sm text-ink-300">
                          <Flame className="size-3.5 text-flame" />
                          <span className="tabular">{Math.round(w.caloriesBurned)}</span>
                        </span>
                        <span className="mr-2 flex items-center gap-1 text-sm text-ink-400">
                          <Timer className="size-3.5" />
                          <span className="tabular">{Math.round(w.durationMin)}m</span>
                        </span>
                        <Link
                          href={`/activity?${day !== today ? `date=${day}&` : ""}repeat=${w.id}`}
                          scroll={false}
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-400 transition hover:bg-white/[0.06] hover:text-volt"
                        >
                          <Repeat2 className="size-3.5" /> Repeat
                        </Link>
                        <DeleteWorkoutButton id={w.id} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1">
                      {groupSets(w.sets).map((g, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <span className="flex shrink-0 items-center gap-1.5 text-ink-200">
                            {g.kind === "CARDIO" ? <HeartPulse className="size-3.5 text-ember" /> : <span className="size-1.5 rounded-full bg-volt" />}
                            {g.name}
                          </span>
                          <span className="truncate text-ink-500">
                            {g.kind === "CARDIO"
                              ? g.sets
                                  .map((s) => {
                                    const d = toDraft(s);
                                    return `${d.durationMin || "?"} min${d.distance ? ` · ${d.distance} ${imperial ? "mi" : "km"}` : ""}`;
                                  })
                                  .join(", ")
                              : g.sets
                                  .map((s) => {
                                    const d = toDraft(s);
                                    return `${d.reps || "?"}×${d.weight ? `${d.weight}${wu}` : "BW"}`;
                                  })
                                  .join("  ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <Card>
            <CardTitle icon={<Footprints className="size-4" />}>Steps · {formatDay(day, { month: "short", day: "numeric" })}</CardTitle>
            <div className="mb-4">
              <div className="tabular text-3xl font-semibold tracking-tight">{summary.steps.toLocaleString()}</div>
              <div className="text-xs text-ink-500">≈ {Math.round(summary.burn.steps)} kcal above resting</div>
            </div>
            <QuickNumber kind="steps" date={day} unit="steps" initial={summary.steps || null} placeholder="e.g. 8500" />
          </Card>
          <Card>
            <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Activity burn {day === today ? "today" : ""}</div>
            <div className="tabular mt-1 text-3xl font-semibold tracking-tight text-flame">{Math.round(summary.burn.steps + summary.burn.workouts)}</div>
            <div className="mt-3 space-y-1.5 text-sm text-ink-400">
              <div className="flex justify-between">
                <span>Steps</span>
                <span className="tabular text-ink-200">{Math.round(summary.burn.steps)}</span>
              </div>
              <div className="flex justify-between">
                <span>Workouts ({todays.length})</span>
                <span className="tabular text-ink-200">{Math.round(summary.burn.workouts)}</span>
              </div>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Workout calories use MET values scaled to your weight and time, counting only what you burn above resting (that part is already in your target).
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
