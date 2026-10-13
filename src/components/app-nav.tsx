"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Gauge, Scale, User, Utensils } from "lucide-react";
import clsx from "clsx";
import { Logo } from "./ui";

const LINKS = [
  { href: "/dashboard", label: "Today", icon: Gauge },
  { href: "/food", label: "Food", icon: Utensils },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/weight", label: "Weight", icon: Scale },
  { href: "/profile", label: "Profile", icon: User },
];

export function AppNav({ name }: { name: string }) {
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(href + "/");
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/[0.05] bg-ink-950/60 px-4 py-6 backdrop-blur-xl lg:flex">
        <Link href="/dashboard" className="px-3 text-lg">
          <Logo />
        </Link>
        <nav className="mt-10 flex flex-col gap-1">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[15px] font-medium transition",
                active(href) ? "bg-white/[0.07] text-ink-100" : "text-ink-400 hover:bg-white/[0.04] hover:text-ink-200",
              )}
            >
              <Icon className={clsx("size-5 transition", active(href) ? "text-volt" : "text-ink-500 group-hover:text-ink-300")} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] p-3">
          <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-violet to-sky text-sm font-semibold text-ink-950">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 text-sm">
            <div className="truncate font-medium">{name}</div>
            <div className="text-xs text-ink-500">Keep showing up</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.05] bg-ink-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </header>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.06] bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium">
              <Icon className={clsx("size-5.5 transition", active(href) ? "text-volt" : "text-ink-500")} strokeWidth={active(href) ? 2.4 : 2} />
              <span className={active(href) ? "text-ink-100" : "text-ink-500"}>{label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
