import { Coffee, Cookie, Moon, Sun, Utensils } from "lucide-react";
import { requireUser, userToday } from "@/lib/auth";
import { db } from "@/lib/db";
import { daySummary } from "@/lib/summary";
import { pageDay } from "@/lib/page-day";
import { addDays } from "@/lib/dates";
import { DateNav } from "@/components/date-nav";
import { FoodLogger } from "@/components/food-logger";
import { MEALS } from "@/lib/meals";
import { CopyMealButton, DeleteFoodButton } from "@/components/food-entry-actions";
import { Bar, Card, EmptyState, PageHeader } from "@/components/ui";

export const metadata = { title: "Food" };

const MEAL_ICONS = { BREAKFAST: Coffee, LUNCH: Sun, DINNER: Moon, SNACK: Cookie } as const;
const r = (n: number) => Math.round(n);

export default async function FoodPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const user = await requireUser();
  const today = await userToday();
  const day = pageDay((await searchParams).date, today);
  const yesterday = addDays(day, -1);

  const [entries, prevMeals, saved, summary] = await Promise.all([
    db.foodEntry.findMany({ where: { userId: user.id, date: day }, orderBy: { createdAt: "asc" } }),
    db.foodEntry.groupBy({ by: ["meal"], where: { userId: user.id, date: yesterday }, _sum: { calories: true } }),
    db.savedFood.findMany({
      where: { userId: user.id },
      orderBy: [{ lastUsedAt: "desc" }],
      take: 200,
      select: { id: true, name: true, servingDesc: true, calories: true, protein: true, carbs: true, fat: true, timesLogged: true },
    }),
    daySummary(user, day),
  ]);
  const prevByMeal = new Map(prevMeals.map((m) => [m.meal, m._sum.calories ?? 0]));
  const t = summary.targets;

  return (
    <>
      <PageHeader title="Food" subtitle="Type it, snap it, or pick from what you've had before." action={<DateNav day={day} today={today} basePath="/food" />} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-4">
          <FoodLogger key={day} date={day} saved={saved} />

          {MEALS.map(({ key, label }) => {
            const rows = entries.filter((e) => e.meal === key);
            const kcal = rows.reduce((a, e) => a + e.calories, 0);
            const Icon = MEAL_ICONS[key];
            const prev = prevByMeal.get(key);
            return (
              <Card key={key} className="p-0 sm:p-0">
                <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-3 sm:px-6">
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4.5 text-ink-500" />
                    <h2 className="font-medium">{label}</h2>
                    {rows.length > 0 && <span className="tabular text-sm text-ink-500">{r(kcal)} kcal</span>}
                  </div>
                  {rows.length === 0 && prev ? (
                    <CopyMealButton fromDate={yesterday} toDate={day} meal={key} label={`Same as yesterday (${r(prev)})`} />
                  ) : null}
                </div>
                {rows.length > 0 ? (
                  <ul className="divide-y divide-white/[0.04] border-t border-white/[0.04]">
                    {rows.map((e) => (
                      <li key={e.id} className="group flex items-center gap-3 px-5 py-3 sm:px-6">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px]">
                            {e.name}
                            {e.servings !== 1 && <span className="ml-1.5 text-sm text-ink-500">× {e.servings}</span>}
                          </div>
                          <div className="truncate text-xs text-ink-500">
                            {e.servingDesc ? `${e.servingDesc} · ` : ""}P {r(e.protein)} · C {r(e.carbs)} · F {r(e.fat)}
                          </div>
                        </div>
                        <span className="tabular text-sm font-medium">{r(e.calories)}</span>
                        <DeleteFoodButton id={e.id} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-5 pb-4 text-sm text-ink-600 sm:px-6">
                    <span className="text-ink-500">Nothing yet</span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-10 lg:self-start">
          <Card>
            <div className="text-xs font-medium uppercase tracking-wider text-ink-500">Calories</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="tabular text-3xl font-semibold">{r(summary.eaten.calories).toLocaleString()}</span>
              <span className="text-sm text-ink-400">/ {r(t.calories).toLocaleString()}</span>
            </div>
            <Bar value={summary.eaten.calories} max={t.calories} color="linear-gradient(90deg, var(--color-volt), var(--color-mint))" className="mt-3 h-2.5" />
            <p className={`mt-2 text-sm ${summary.remaining < 0 ? "text-ember" : "text-ink-400"}`}>
              {summary.remaining < 0 ? `${r(-summary.remaining).toLocaleString()} over target` : `${r(summary.remaining).toLocaleString()} left`}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                { l: "Protein", v: summary.eaten.protein, t: t.protein, c: "text-sky" },
                { l: "Carbs", v: summary.eaten.carbs, t: t.carbs, c: "text-amber" },
                { l: "Fat", v: summary.eaten.fat, t: t.fat, c: "text-violet" },
              ].map((m) => (
                <div key={m.l} className="rounded-2xl bg-white/[0.03] py-3">
                  <div className={`tabular text-lg font-semibold ${m.c}`}>{r(m.v)}g</div>
                  <div className="text-[11px] text-ink-500">
                    {m.l} / {r(m.t)}g
                  </div>
                </div>
              ))}
            </div>
            <dl className="mt-5 space-y-1.5 text-xs text-ink-500">
              <div className="flex justify-between">
                <dt>Fiber</dt>
                <dd className="tabular text-ink-300">{r(summary.eaten.fiber)} g</dd>
              </div>
              <div className="flex justify-between">
                <dt>Sugar</dt>
                <dd className="tabular text-ink-300">{r(summary.eaten.sugar)} g</dd>
              </div>
              <div className="flex justify-between">
                <dt>Sodium</dt>
                <dd className="tabular text-ink-300">{r(summary.eaten.sodium).toLocaleString()} mg</dd>
              </div>
            </dl>
          </Card>
          {entries.length === 0 && (
            <EmptyState icon={<Utensils className="size-5" />} title="Nothing logged yet">
              Describe your meal like you&apos;d text a friend. If something matters for the calories, ALLIN1 will ask.
            </EmptyState>
          )}
        </aside>
      </div>
    </>
  );
}
