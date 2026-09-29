import { useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, Brush, CartesianGrid, Cell, ComposedChart, Funnel, FunnelChart, LabelList, Legend,
  Line, LineChart, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, Treemap, XAxis, YAxis, ZAxis,
} from "recharts";
import type { ChartType, Row } from "@/lib/data/types";
import { formatValue } from "@/lib/data/format";
import { monthLabel } from "@/lib/data/analytics";

export const PALETTE = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)", "var(--muted-foreground)", "var(--saffron)"];

export interface ChartData { labelKey: string; valueKeys: string[]; rows: Row[] }

const tickLabel = (v: unknown) => {
  const s = String(v ?? "");
  if (/^\d{4}-\d{2}$/.test(s)) return monthLabel(s);
  return s.length > 16 ? s.slice(0, 15) + "…" : s;
};

export function ChartView({ type, data, height = 300, compact }: { type: ChartType; data: ChartData; height?: number; compact?: boolean }) {
  const { labelKey, valueKeys, rows } = data;
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visible = valueKeys.filter((k) => !hidden.has(k));
  const toggle = (k: string) => setHidden((h) => { const n = new Set(h); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const fmt = (k: string) => (v: unknown) => formatValue(k, v);
  const yFmt = (v: number) => formatValue(valueKeys[0] ?? "", v);
  const showBrush = !compact && rows.length > 14 && ["bar", "line", "area", "grouped", "stacked", "combo"].includes(type);
  const legend = valueKeys.length > 1 ? <Legend onClick={(e) => toggle(String(e.dataKey))} wrapperStyle={{ fontSize: 12, cursor: "pointer" }} formatter={(v) => <span style={{ opacity: hidden.has(String(v)) ? 0.35 : 1 }}>{v}</span>} /> : null;
  const tooltip = <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} labelFormatter={tickLabel} formatter={(v, n) => [formatValue(String(n), v), n]} />;
  const axisProps = { tick: { fontSize: 11, fill: "var(--muted-foreground)" }, stroke: "var(--border)" };

  const pareto = useMemo(() => {
    if (type !== "pareto" || !valueKeys[0]) return rows;
    const k = valueKeys[0];
    const sorted = [...rows].sort((a, b) => ((b[k] as number) ?? 0) - ((a[k] as number) ?? 0));
    const total = sorted.reduce((a, r) => a + ((r[k] as number) || 0), 0);
    let cum = 0;
    return sorted.map((r) => { cum += (r[k] as number) || 0; return { ...r, "Cumulative %": total ? Math.round((cum / total) * 1000) / 10 : 0 }; });
  }, [type, rows, valueKeys]);

  if (!rows.length) return <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>No data for the current selection.</div>;

  if (type === "kpi") {
    return (
      <div className="grid gap-3 sm:grid-cols-2" style={{ minHeight: height / 2 }}>
        {valueKeys.map((k) => (
          <div key={k} className="rounded-lg border bg-secondary/50 p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="mt-1 font-display text-3xl font-semibold">{formatValue(k, rows[0][k], false)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="overflow-auto rounded-md border" style={{ maxHeight: height }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-secondary text-left text-xs text-muted-foreground">
            <tr>{[labelKey, ...valueKeys].map((k) => <th key={k} className="px-3 py-2 font-medium">{k}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5">{tickLabel(r[labelKey])}</td>
                {valueKeys.map((k) => <td key={k} className="px-3 py-1.5 text-right font-mono text-xs">{formatValue(k, r[k], false)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  let chart: React.ReactElement;
  switch (type) {
    case "pie":
    case "donut": {
      const k = valueKeys[0];
      const sorted = [...rows].sort((a, b) => ((b[k] as number) ?? 0) - ((a[k] as number) ?? 0));
      const top = sorted.slice(0, 7);
      const rest = sorted.slice(7).reduce((a, r) => a + ((r[k] as number) || 0), 0);
      const pieRows = rest > 0 ? [...top, { [labelKey]: "Others", [k]: rest }] : top;
      chart = (
        <PieChart>
          <Pie data={pieRows} dataKey={k} nameKey={labelKey} innerRadius={type === "donut" ? "55%" : 0} outerRadius="85%" paddingAngle={type === "donut" ? 2 : 0} stroke="var(--card)">
            {pieRows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          {tooltip}
          <Legend wrapperStyle={{ fontSize: 12 }} formatter={tickLabel} />
        </PieChart>
      );
      break;
    }
    case "hbar":
      chart = (
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 24 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" {...axisProps} tickFormatter={yFmt} />
          <YAxis type="category" dataKey={labelKey} width={120} {...axisProps} tickFormatter={tickLabel} interval={0} />
          {tooltip}{legend}
          {visible.map((k, i) => <Bar key={k} dataKey={k} fill={PALETTE[i]} radius={[0, 4, 4, 0]} maxBarSize={22} />)}
        </BarChart>
      );
      break;
    case "line":
      chart = (
        <LineChart data={rows} margin={{ right: 16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={labelKey} {...axisProps} tickFormatter={tickLabel} minTickGap={16} />
          <YAxis {...axisProps} tickFormatter={yFmt} width={70} />
          {tooltip}{legend}
          {visible.map((k) => <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[valueKeys.indexOf(k) % PALETTE.length]} strokeWidth={2.2} dot={rows.length < 30} />)}
          {showBrush && <Brush dataKey={labelKey} height={20} stroke="var(--primary)" tickFormatter={tickLabel} />}
        </LineChart>
      );
      break;
    case "area":
      chart = (
        <AreaChart data={rows} margin={{ right: 16 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={labelKey} {...axisProps} tickFormatter={tickLabel} minTickGap={16} />
          <YAxis {...axisProps} tickFormatter={yFmt} width={70} />
          {tooltip}{legend}
          {visible.map((k) => { const c = PALETTE[valueKeys.indexOf(k) % PALETTE.length]; return <Area key={k} type="monotone" dataKey={k} stroke={c} fill={c} fillOpacity={0.18} strokeWidth={2} stackId={valueKeys.length > 2 ? "a" : undefined} />; })}
          {showBrush && <Brush dataKey={labelKey} height={20} stroke="var(--primary)" tickFormatter={tickLabel} />}
        </AreaChart>
      );
      break;
    case "scatter": {
      const [xk, yk, zk] = valueKeys;
      chart = (
        <ScatterChart margin={{ right: 16 }}>
          <CartesianGrid stroke="var(--border)" />
          <XAxis type="number" dataKey={xk} name={xk} {...axisProps} tickFormatter={fmt(xk)} />
          <YAxis type="number" dataKey={yk ?? xk} name={yk ?? xk} {...axisProps} tickFormatter={fmt(yk ?? xk)} width={70} />
          {zk && <ZAxis type="number" dataKey={zk} range={[40, 400]} name={zk} />}
          <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v, n) => [formatValue(String(n), v), n]} />
          <Scatter data={rows} fill="var(--chart-1)" fillOpacity={0.7} />
        </ScatterChart>
      );
      break;
    }
    case "combo":
    case "pareto": {
      const barK = valueKeys[0];
      const lineK = type === "pareto" ? "Cumulative %" : valueKeys[1];
      chart = (
        <ComposedChart data={type === "pareto" ? pareto : rows} margin={{ right: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={labelKey} {...axisProps} tickFormatter={tickLabel} minTickGap={8} />
          <YAxis yAxisId="l" {...axisProps} tickFormatter={yFmt} width={70} />
          {lineK && <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={type === "pareto" ? (v) => `${v}%` : fmt(lineK)} width={60} />}
          {tooltip}<Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="l" dataKey={barK} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          {lineK && <Line yAxisId="r" type="monotone" dataKey={lineK} stroke="var(--chart-2)" strokeWidth={2.4} dot />}
          {showBrush && <Brush dataKey={labelKey} height={20} stroke="var(--primary)" tickFormatter={tickLabel} />}
        </ComposedChart>
      );
      break;
    }
    case "treemap": {
      const k = valueKeys[0];
      const tm = rows.filter((r) => ((r[k] as number) ?? 0) > 0).map((r, i) => ({ name: String(r[labelKey]), size: r[k] as number, fill: PALETTE[i % 6] }));
      chart = (
        <Treemap data={tm} dataKey="size" nameKey="name" stroke="var(--card)" content={<TreeCell />}>
          <Tooltip formatter={(v) => formatValue(k, v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        </Treemap>
      );
      break;
    }
    case "funnel": {
      const k = valueKeys[0];
      const f = [...rows].sort((a, b) => ((b[k] as number) ?? 0) - ((a[k] as number) ?? 0)).slice(0, 8).map((r, i) => ({ name: String(r[labelKey]), value: r[k] as number, fill: PALETTE[i % 6] }));
      chart = (
        <FunnelChart>
          {tooltip}
          <Funnel dataKey="value" data={f} isAnimationActive>
            <LabelList position="right" fill="var(--foreground)" stroke="none" dataKey="name" fontSize={12} />
          </Funnel>
        </FunnelChart>
      );
      break;
    }
    case "histogram":
    case "bar":
    case "grouped":
    case "stacked":
    default:
      chart = (
        <BarChart data={rows} margin={{ right: 8 }} barCategoryGap={type === "histogram" ? 1 : "20%"}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey={labelKey} {...axisProps} tickFormatter={tickLabel} minTickGap={4} interval={rows.length > 16 ? "preserveStartEnd" : 0} angle={rows.length > 8 && type !== "histogram" ? -25 : 0} textAnchor={rows.length > 8 && type !== "histogram" ? "end" : "middle"} height={rows.length > 8 ? 56 : 30} />
          <YAxis {...axisProps} tickFormatter={yFmt} width={70} />
          {tooltip}{legend}
          {visible.map((k) => <Bar key={k} dataKey={k} stackId={type === "stacked" ? "s" : undefined} fill={PALETTE[valueKeys.indexOf(k) % PALETTE.length]} radius={type === "stacked" ? 0 : [4, 4, 0, 0]} maxBarSize={type === "histogram" ? undefined : 44} />)}
          {showBrush && <Brush dataKey={labelKey} height={20} stroke="var(--primary)" tickFormatter={tickLabel} />}
        </BarChart>
      );
  }
  return <div style={{ height }} className="w-full"><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div>;
}

function TreeCell(props: { x?: number; y?: number; width?: number; height?: number; name?: string; fill?: string }) {
  const { x = 0, y = 0, width = 0, height = 0, name, fill } = props;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} stroke="var(--card)" strokeWidth={2} />
      {width > 60 && height > 22 && <text x={x + 6} y={y + 16} fontSize={11} fill="var(--primary-foreground)">{String(name).slice(0, Math.floor(width / 7))}</text>}
    </g>
  );
}

export const CHART_TYPES: { id: ChartType; label: string }[] = [
  { id: "bar", label: "Bar" }, { id: "hbar", label: "Horizontal bar" }, { id: "grouped", label: "Grouped bar" }, { id: "stacked", label: "Stacked bar" },
  { id: "line", label: "Line" }, { id: "area", label: "Area" }, { id: "pie", label: "Pie" }, { id: "donut", label: "Donut" },
  { id: "scatter", label: "Scatter / bubble" }, { id: "combo", label: "Combo" }, { id: "pareto", label: "Pareto" }, { id: "treemap", label: "Treemap" },
  { id: "funnel", label: "Funnel" }, { id: "histogram", label: "Histogram" }, { id: "table", label: "Table" }, { id: "kpi", label: "KPI" },
];
