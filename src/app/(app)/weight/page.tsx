import { Scale, TrendingDown, TrendingUp } from "lucide-react";
import { requireUser, userToday } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, formatDay, relativeDayLabel } from "@/lib/dates";
import { trendSlope, weightTrend } from "@/lib/energy";
import { displayWeight, weightUnit } from "@/lib/units";
import { WeightChart } from "@/components/weight-chart";
import { DeleteWeightButton, WeightEntryForm } from "@/components/weight-entry-form";
import { Card, CardTitle, EmptyState, PageHeader, Stat } from "@/components/ui";

export const metadata = { title: "Weight" };

export default async function WeightPage() {
  const user = await requireUser();
  const today = await userToday();
  const entries = await db.weightEntry.findMany({ where: { userId: user.id }, orderBy: { date: "asc" } });
  const wu = weightUnit(user.units);
  const dw = (kg: number, d = 1) => displayWeight(kg, user.units, d);

  const trend = weightTrend(entries.map((e) => ({ date: e.date, weightKg: e.weightKg })));
  const last = trend[trend.length - 1];
  const first = entries[0];
  const recent = trend.filter((p) => p.date >= addDays(last?.date ?? today, -20));
  const slopePerWeek = recent.length >= 7 ? trendSlope(recent) * 7 : null;
  const todays = entries.find((e) => e.date === today);

  let eta: string | null = null;
  if (user.goalWeightKg && last && slopePerWeek) {
    const remaining = user.goalWeightKg - last.trendKg;
    if (Math.sign(remaining) === Math.sign(slopePerWeek) && Math.abs(remaining) > 0.2) {
      const weeks = remaining / slopePerWeek;
      if (weeks < 260) eta = formatDay(addDays(today, Math.round(weeks * 7)), { month: "long", day: "numeric", year: "numeric" });
    }
  }

  const onTrack =
    slopePerWeek == null
      ? null
      : user.goal === "CUT"
        ? slopePerWeek < 0
        : user.goal === "BULK"
          ? slopePerWeek > 0
          : Math.abs(slopePerWeek) < 0.15;

  return (
    <>
      <PageHeader title="Weight" subtitle="Weigh in every morning. The trend line smooths out water and food swings so you see what's really happening." />
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="mb-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
              <Stat label="Trend" value={last ? dw(last.trendKg) : "—"} unit={wu} />
              <Stat
                label="Change"
                value={last && first ? `${last.trendKg - first.weightKg >= 0 ? "+" : "−"}${Math.abs(dw(last.trendKg - first.weightKg))}` : "—"}
                unit={wu}
                sub={first ? `since ${formatDay(first.date, { month: "short", day: "numeric" })}` : undefined}
              />
              <Stat
                label="Per week"
                value={slopePerWeek != null ? `${slopePerWeek >= 0 ? "+" : "−"}${Math.abs(dw(slopePerWeek, 2))}` : "—"}
                unit={wu}
                accent={onTrack == null ? undefined : onTrack ? "var(--color-volt)" : "var(--color-flame)"}
                sub={
                  slopePerWeek == null
                    ? "needs a week of data"
                    : user.goal !== "MAINTAIN"
                      ? `goal ${user.goal === "CUT" ? "−" : "+"}${dw(user.weeklyRateKg, 2)} ${wu}/wk`
                      : "goal: hold steady"
                }
              />
              <Stat label="Goal" value={user.goalWeightKg ? dw(user.goalWeightKg) : "—"} unit={user.goalWeightKg ? wu : undefined} sub={eta ? `≈ ${eta}` : undefined} />
            </div>
            {trend.length >= 2 ? (
              <WeightChart data={trend.map((p) => ({ date: p.date, weight: p.weightKg != null ? dw(p.weightKg, 2) : null, trend: dw(p.trendKg, 2) }))} unit={wu} />
            ) : (
              <EmptyState icon={<Scale className="size-5" />} title="Your chart starts tomorrow">
                Log a weigh-in each day and your trend line will appear here.
              </EmptyState>
            )}
          </Card>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <Card>
            <CardTitle icon={<Scale className="size-4" />}>Weigh-in</CardTitle>
            <WeightEntryForm today={today} unit={wu} initial={todays ? String(dw(todays.weightKg)) : ""} />
          </Card>
          <Card className="p-0 sm:p-0">
            <div className="px-5 pt-5 pb-2 text-sm font-medium text-ink-300 sm:px-6">Log</div>
            <ul className="max-h-96 overflow-y-auto px-2 pb-3">
              {[...trend].reverse().filter((p) => p.weightKg != null).slice(0, 60).map((p) => {
                const entry = entries.find((e) => e.date === p.date)!;
                const diff = p.weightKg! - p.trendKg;
                return (
                  <li key={p.date} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/[0.03]">
                    <span className="flex-1 text-sm text-ink-400">{relativeDayLabel(p.date, today)}</span>
                    <span className="flex items-center gap-1 text-xs text-ink-600">
                      {diff > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                      {Math.abs(dw(diff))}
                    </span>
                    <span className="tabular w-16 text-right text-sm font-medium">{dw(p.weightKg!)}</span>
                    <DeleteWeightButton id={entry.id} />
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>
    </>
  );
}
