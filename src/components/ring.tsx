import type { ReactNode } from "react";

/** Circular progress ring. Turns red when value passes max. */
export function Ring({
  value,
  max,
  size = 200,
  stroke = 16,
  gradient = ["#c4f542", "#34d399"],
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  gradient?: [string, string];
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const over = max > 0 && value > max;
  const id = `ring-${gradient.join("").replace(/[^a-z0-9]/gi, "")}-${size}`;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={over ? "#ff4f81" : gradient[0]} />
            <stop offset="100%" stopColor={over ? "#ff7a45" : gradient[1]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(255 255 255 / 0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)", filter: `drop-shadow(0 0 12px ${over ? "#ff4f8155" : gradient[0] + "55"})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
