import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ForecastPoint } from "@/lib/data/forecast";
import { formatValue } from "@/lib/data/format";
import { monthLabel } from "@/lib/data/analytics";

export function ForecastChart({ points, valueKey, height = 320 }: { points: ForecastPoint[]; valueKey: string; height?: number }) {
  const data = points.map((p) => ({ ...p, band: p.lower != null && p.upper != null ? [p.lower, p.upper] : undefined }));
  const lbl = (v: unknown) => (/^\d{4}-\d{2}$/.test(String(v)) ? monthLabel(String(v)) : String(v));
  const f = (v: unknown) => (Array.isArray(v) ? `${formatValue(valueKey, v[0])} – ${formatValue(valueKey, v[1])}` : formatValue(valueKey, v));
  return (
    <div style={{ height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ right: 16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" tickFormatter={lbl} minTickGap={16} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" tickFormatter={(v) => formatValue(valueKey, v)} width={70} />
          <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelFormatter={lbl}
            formatter={(v, n) => [f(v), n === "band" ? "95% range" : n === "actual" ? "Actual" : "Forecast (estimate)"]} />
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "band" ? "95% range" : v === "actual" ? "Actual" : "Forecast (estimate)")} />
          <Area dataKey="band" stroke="none" fill="var(--saffron)" fillOpacity={0.18} />
          <Line dataKey="actual" stroke="var(--chart-1)" strokeWidth={2.2} dot={false} />
          <Line dataKey="forecast" stroke="var(--saffron)" strokeWidth={2.2} strokeDasharray="6 4" dot={{ r: 2.5 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
