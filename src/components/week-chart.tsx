"use client";

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeekChart({ data, target }: { data: { date: string; calories: number }[]; target: number }) {
  const rows = data.map((d) => ({
    ...d,
    label: new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "narrow", timeZone: "UTC" }),
  }));
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <YAxis hide domain={[0, Math.max(target, ...rows.map((r) => r.calories)) * 1.1]} />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#5b6478", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgb(255 255 255 / 0.04)" }}
            contentStyle={{ background: "#10131b", border: "1px solid rgb(255 255 255 / 0.08)", borderRadius: 14, fontSize: 13 }}
            labelFormatter={(_, p) => (p?.[0] ? new Date(p[0].payload.date + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }) : "")}
            formatter={(v) => [`${Math.round(Number(v)).toLocaleString()} kcal`, "Eaten"]}
          />
          <ReferenceLine y={target} stroke="#c4f542" strokeDasharray="4 4" strokeOpacity={0.5} />
          <Bar dataKey="calories" radius={[8, 8, 8, 8]} maxBarSize={34}>
            {rows.map((r) => (
              <Cell key={r.date} fill={r.calories === 0 ? "rgb(255 255 255 / 0.06)" : r.calories > target * 1.05 ? "#ff7a45" : "#c4f542"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
