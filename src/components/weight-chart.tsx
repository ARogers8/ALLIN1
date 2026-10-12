"use client";

import { useState } from "react";
import { Area, ComposedChart, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import clsx from "clsx";

export interface WeightChartPoint {
  date: string;
  weight: number | null;
  trend: number;
}

const RANGES = [
  { key: 30, label: "1M" },
  { key: 90, label: "3M" },
  { key: 365, label: "1Y" },
  { key: 0, label: "All" },
];

export function WeightChart({ data, unit }: { data: WeightChartPoint[]; unit: string }) {
  const [range, setRange] = useState(90);
  const rows = range ? data.slice(-range) : data;
  const values = rows.flatMap((r) => [r.trend, r.weight ?? r.trend]);
  const min = Math.floor(Math.min(...values) - 1);
  const max = Math.ceil(Math.max(...values) + 1);
  return (
    <div>
      <div className="mb-3 flex justify-end gap-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={clsx("rounded-lg px-2.5 py-1 text-xs font-medium transition", range === r.key ? "bg-white/[0.1] text-ink-100" : "text-ink-500 hover:text-ink-200")}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div className="h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4f542" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#c4f542" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              minTickGap={40}
              tick={{ fill: "#5b6478", fontSize: 12 }}
              tickFormatter={(d: string) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
            />
            <YAxis domain={[min, max]} axisLine={false} tickLine={false} tick={{ fill: "#5b6478", fontSize: 12 }} width={48} />
            <Tooltip
              contentStyle={{ background: "#10131b", border: "1px solid rgb(255 255 255 / 0.08)", borderRadius: 14, fontSize: 13 }}
              labelFormatter={(d) => new Date(String(d) + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
              formatter={(v, n) => [`${Number(v).toFixed(1)} ${unit}`, n === "trend" ? "Trend" : "Scale"]}
            />
            <Area type="monotone" dataKey="trend" stroke="#c4f542" strokeWidth={2.5} fill="url(#trendFill)" dot={false} activeDot={{ r: 4 }} />
            <Scatter dataKey="weight" fill="#e9ecf3" fillOpacity={0.55} shape="circle" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
