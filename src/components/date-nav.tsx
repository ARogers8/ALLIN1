import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDay, relativeDayLabel } from "@/lib/dates";

export function DateNav({ day, today, basePath }: { day: string; today: string; basePath: string }) {
  const href = (d: string) => (d === today ? basePath : `${basePath}?date=${d}`);
  const isToday = day === today;
  return (
    <div className="inline-flex items-center gap-1 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1">
      <Link href={href(addDays(day, -1))} className="grid size-9 place-items-center rounded-xl text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100" aria-label="Previous day">
        <ChevronLeft className="size-4.5" />
      </Link>
      <div className="min-w-32 px-2 text-center">
        <div className="text-sm font-medium">{relativeDayLabel(day, today)}</div>
        {(isToday || day === addDays(today, -1)) && <div className="text-[11px] text-ink-500">{formatDay(day, { month: "short", day: "numeric" })}</div>}
      </div>
      {isToday ? (
        <span className="grid size-9 place-items-center text-ink-700">
          <ChevronRight className="size-4.5" />
        </span>
      ) : (
        <Link href={href(addDays(day, 1))} className="grid size-9 place-items-center rounded-xl text-ink-400 transition hover:bg-white/[0.06] hover:text-ink-100" aria-label="Next day">
          <ChevronRight className="size-4.5" />
        </Link>
      )}
    </div>
  );
}
