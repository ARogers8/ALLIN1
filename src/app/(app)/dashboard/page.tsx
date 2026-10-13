import Link from "next/link";
import { ArrowRight, Dumbbell, Footprints, Plus, Scale, Sparkles, Target, Zap } from "lucide-react";
import { requireUser, userToday } from "@/lib/auth";
import { daySummary, weekHistory } from "@/lib/summary";
import { pageDay } from "@/lib/page-day";
import { displayWeight, weightUnit } from "@/lib/units";
import { KCAL_PER_KG } from "@/lib/energy";
import { addDays, formatDay } from "@/lib/dates";
import { Ring } from "@/components/ring";
import { DateNav } from "@/components/date-nav";
import { QuickNumber } from "@/components/quick-number";
import { WeekChart } from "@/components/week-chart";
import { Badge, Card, CardTitle, MacroBar } from "@/components/ui";

export const metadata = { title: "Today" };

const fmt = (n: number) => Math.round(n).toLocaleString();

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const today = await userToday();
  const day = pageDay((await searchParams).date, today);
  const [s, week] = await Promise.all([daySummary(user, day), weekHistory(user, day)]);
  const t = s.targets;
  const over = s.remaining < 0;
  const wu = weightUnit(user.units);
  const isToday = day === today;

  const trend = s.trend;
  const weekAgo = trend.find((p) => p.date === addDays(day, -7));
  const last = trend.length ? trend[trend.length - 1] : null;
  const weeklyChange = last && weekAgo ? last.trendKg - weekAgo.trendKg : null;

  const net = s.eaten.calories - t.burn;
  const calibrationPct = Math.round((s.calibration.factor - 1) * 100);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">{formatDay(day)}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {isToday ? "Today" : "Looking back"}, <span className="text-gradient">{user.name}</span>
          </h1>
        </div>
        <DateNav day={day} today={today} basePath="/dashboard" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calories hero */}
        <Card className="animate-rise lg:col-span-2">
          <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-center">
            <Ring value={s.eaten.calories} max={t.calories} size={210} stroke={18}>
              <div>
                <div className="tabular text-4xl font-semibold tracking-tight">{fmt(Math.abs(s.remaining))}</div>
                <div className={over ? "text-sm text-ember" : "text-sm text-ink-400"}>{over ? "kcal over" : "kcal left"}</div>
              </div>
            </Ring>
            <div className="w-full flex-1 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Target</div>
                  <div className="tabular mt-1 text-xl font-semibold">{fmt(t.calories)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Eaten</div>
                  <div className="tabular mt-1 text-xl font-semibold text-volt">{fmt(s.eaten.calories)}</div>
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Burned</div>
                  <div className="tabular mt-1 text-xl font-semibold text-flame">{fmt(t.burn)}</div>
                </div>
              </div>
              <div className="space-y-3.5">
                <MacroBar label="Protein" value={s.eaten.protein} target={t.protein} color="var(--color-sky)" />
                <MacroBar label="Carbs" value={s.eaten.carbs} target={t.carbs} color="var(--color-amber)" />
                <MacroBar label="Fat" value={s.eaten.fat} target={t.fat} color="var(--color-violet)" />
              </div>
              <Link href={isToday ? "/food" : `/food?date=${day}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-volt hover:underline">
                <Plus className="size-4" /> Log food
              </Link>
            </div>
          </div>
        </Card>

        {/* How the target is built */}
        <Card className="animate-rise [animation-delay:60ms]">
          <CardTitle icon={<Target className="size-4" />}>How your target is built</CardTitle>
          <dl className="space-y-2.5 text-sm">
            <Row label="Resting metabolism" value={s.burn.bmr} />
            <Row label="Digestion & daily life" value={s.burn.baseline} />
            <Row label={`Steps (${s.steps.toLocaleString()})`} value={s.burn.steps} icon={<Footprints className="size-3.5" />} />
            <Row label={`Workouts (${s.workoutCount})`} value={s.burn.workouts} icon={<Dumbbell className="size-3.5" />} />
            {s.calibration.status === "calibrated" && calibrationPct !== 0 && (
              <Row label="Calibrated to your trend" value={t.burn - s.burn.total} signed icon={<Sparkles className="size-3.5" />} />
            )}
            <div className="my-1 border-t border-white/[0.06]" />
            <Row label="Total burn" value={t.burn} strong />
            {t.goalDelta !== 0 && <Row label={user.goal === "CUT" ? "Deficit to cut" : "Surplus to bulk"} value={t.goalDelta} signed />}
            <div className="flex items-center justify-between rounded-xl bg-volt/[0.08] px-3 py-2">
              <dt className="font-medium text-volt">Eat today</dt>
              <dd className="tabular font-semibold text-volt">{fmt(t.calories)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-ink-500">
            {s.calibration.status === "calibrated" ? (
              <>
                Calibrated from {s.calibration.loggedDays} logged days and your weigh-in trend
                {calibrationPct !== 0 ? `: you burn about ${Math.abs(calibrationPct)}% ${calibrationPct > 0 ? "more" : "less"} than the formula predicts.` : ". The formula matches you well."}
              </>
            ) : (
              <>
                Learning your metabolism: {s.calibration.loggedDays}/10 days of food logged, {s.calibration.weighInSpanDays}/14 days of weigh-ins. Keep logging and your target will
                self-correct.
              </>
            )}
            {t.floored && " Your target is held at a safe minimum."}
          </p>
        </Card>

        {/* Weight */}
        <Card className="animate-rise [animation-delay:100ms]">
          <CardTitle
            icon={<Scale className="size-4" />}
            action={
              <Link href="/weight" className="text-xs text-ink-400 hover:text-ink-100">
                History <ArrowRight className="inline size-3" />
              </Link>
            }
          >
            Weigh-in
          </CardTitle>
          <div className="mb-4 flex items-end gap-4">
            <div>
              <div className="tabular text-3xl font-semibold tracking-tight">
                {last ? displayWeight(last.trendKg, user.units) : "—"} <span className="text-base font-normal text-ink-400">{wu}</span>
              </div>
              <div className="text-xs text-ink-500">trend weight</div>
            </div>
            {weeklyChange != null && (
              <Badge tone={(user.goal === "CUT" ? weeklyChange <= 0 : user.goal === "BULK" ? weeklyChange >= 0 : Math.abs(weeklyChange) < 0.25) ? "volt" : "flame"} className="mb-1">
                {weeklyChange >= 0 ? "+" : "−"}
                {Math.abs(displayWeight(weeklyChange, user.units, 2))} {wu} this week
              </Badge>
            )}
          </div>
          <QuickNumber
            kind="weight"
            date={day}
            unit={wu}
            initial={s.weighedInToday && s.weightKg ? displayWeight(s.weightKg, user.units) : null}
            placeholder={isToday ? "Today's weight" : "Weight"}
          />
        </Card>

        {/* Steps */}
        <Card className="animate-rise [animation-delay:140ms]">
          <CardTitle icon={<Footprints className="size-4" />}>Steps</CardTitle>
          <div className="mb-4">
            <div className="tabular text-3xl font-semibold tracking-tight">{s.steps.toLocaleString()}</div>
            <div className="text-xs text-ink-500">≈ {fmt(s.burn.steps)} kcal burned</div>
          </div>
          <QuickNumber kind="steps" date={day} unit="steps" initial={s.steps || null} placeholder="e.g. 8500" />
        </Card>

        {/* Balance */}
        <Card className="animate-rise [animation-delay:180ms]">
          <CardTitle icon={<Zap className="size-4" />}>Energy balance</CardTitle>
          <div className="tabular text-3xl font-semibold tracking-tight">
            <span className={net > 0 ? "text-flame" : "text-sky"}>
              {net > 0 ? "+" : "−"}
              {fmt(Math.abs(net))}
            </span>{" "}
            <span className="text-base font-normal text-ink-400">kcal</span>
          </div>
          <p className="mt-1 text-sm text-ink-400">
            {net > 0 ? "Surplus" : "Deficit"} so far {isToday ? "today" : "that day"}, about {displayWeight(Math.abs(net) / KCAL_PER_KG, user.units, 2)} {wu} of{" "}
            {net > 0 ? "gain" : "loss"}.
          </p>
          <Link href={isToday ? "/activity" : `/activity?date=${day}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-volt hover:underline">
            <Dumbbell className="size-4" /> {s.workoutCount ? `${s.workoutCount} workout${s.workoutCount > 1 ? "s" : ""} logged` : "Log a workout"}
          </Link>
        </Card>

        {/* Week */}
        <Card className="animate-rise [animation-delay:220ms] lg:col-span-3">
          <CardTitle action={<span className="text-xs text-ink-500">dashed line = today&apos;s target</span>}>Last 7 days</CardTitle>
          <WeekChart data={week} target={t.calories} />
        </Card>
      </div>
    </>
  );
}

function Row({ label, value, icon, strong, signed }: { label: string; value: number; icon?: React.ReactNode; strong?: boolean; signed?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={strong ? "font-medium text-ink-100" : "flex items-center gap-1.5 text-ink-400"}>
        {icon}
        {label}
      </dt>
      <dd className={`tabular ${strong ? "font-semibold text-ink-100" : "text-ink-200"}`}>
        {signed && value > 0 ? "+" : signed && value < 0 ? "−" : ""}
        {fmt(signed ? Math.abs(value) : value)}
      </dd>
    </div>
  );
}
