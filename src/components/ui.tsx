import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export const cn = (...v: ClassValue[]) => twMerge(clsx(v));

export function Card({ className, children, ...rest }: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("card p-5 sm:p-6", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ icon, children, action, className }: { icon?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={clsx("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="flex items-center gap-2 text-sm font-medium tracking-wide text-ink-300">
        {icon && <span className="text-ink-400">{icon}</span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  primary:
    "bg-volt text-ink-950 hover:bg-volt-600 shadow-[0_8px_30px_-8px_rgb(196_245_66/0.5)] disabled:bg-ink-700 disabled:text-ink-400 disabled:shadow-none",
  secondary: "bg-white/[0.06] text-ink-100 hover:bg-white/[0.1] border border-white/[0.06]",
  ghost: "text-ink-300 hover:text-ink-100 hover:bg-white/[0.05]",
  danger: "text-ember hover:bg-ember/10",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl font-medium transition active:scale-[0.98] disabled:cursor-not-allowed",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-4 text-sm",
        size === "lg" && "h-13 px-6 text-base",
        variants[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "h-11 w-full rounded-2xl border border-white/[0.08] bg-ink-900/80 px-4 text-[15px] text-ink-100 outline-none transition placeholder:text-ink-500 focus:border-volt/60 focus:ring-4 focus:ring-volt/10",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "h-11 w-full appearance-none rounded-2xl border border-white/[0.08] bg-ink-900/80 px-4 text-[15px] text-ink-100 outline-none transition focus:border-volt/60 focus:ring-4 focus:ring-volt/10",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Label({ children, hint, htmlFor }: { children: ReactNode; hint?: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-ink-300">
      <span>{children}</span>
      {hint && <span className="text-xs font-normal text-ink-500">{hint}</span>}
    </label>
  );
}

export function Field({ label, hint, children, className }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label hint={hint}>{label}</Label>
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "volt" | "flame" | "sky" | "violet"; className?: string }) {
  const tones = {
    neutral: "bg-white/[0.06] text-ink-300",
    volt: "bg-volt/15 text-volt",
    flame: "bg-flame/15 text-flame",
    sky: "bg-sky/15 text-sky",
    violet: "bg-violet/15 text-violet",
  };
  return <span className={clsx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Bar({ value, max, color, className }: { value: number; max: number; color: string; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const over = max > 0 && value > max * 1.02;
  return (
    <div className={clsx("h-2 w-full overflow-hidden rounded-full bg-white/[0.06]", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${pct}%`, background: over ? "var(--color-ember)" : color }}
      />
    </div>
  );
}

export function MacroBar({ label, value, target, color, unit = "g" }: { label: string; value: number; target: number; color: string; unit?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm">
        <span className="flex items-center gap-2 text-ink-300">
          <span className="size-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular text-ink-400">
          <span className="font-medium text-ink-100">{Math.round(value)}</span> / {Math.round(target)}
          {unit}
        </span>
      </div>
      <Bar value={value} max={target} color={color} />
    </div>
  );
}

export function Stat({ label, value, unit, sub, accent }: { label: string; value: ReactNode; unit?: string; sub?: ReactNode; accent?: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="tabular text-2xl font-semibold tracking-tight" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
        {unit && <span className="text-sm text-ink-400">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-ink-500">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.08] px-6 py-10 text-center">
      <div className="mb-3 grid size-11 place-items-center rounded-2xl bg-white/[0.05] text-ink-400">{icon}</div>
      <div className="font-medium text-ink-200">{title}</div>
      {children && <div className="mt-1 max-w-sm text-sm text-ink-500">{children}</div>}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <span className="grid size-8 place-items-center rounded-xl bg-volt text-ink-950 shadow-[0_6px_24px_-6px_rgb(196_245_66/0.7)]">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      </span>
      <span>
        ALL<span className="text-volt">IN</span>1
      </span>
    </span>
  );
}
