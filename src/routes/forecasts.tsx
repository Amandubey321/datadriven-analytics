import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppShell";
import { NeedData } from "@/components/NeedData";
import { ForecastChart } from "@/components/charts/ForecastChart";
import type { Dataset } from "@/lib/data/types";
import { forecast, HORIZONS, type Horizon } from "@/lib/data/forecast";
import { getRoles, monthLabel } from "@/lib/data/analytics";
import { useStore } from "@/lib/store";
import { formatValue } from "@/lib/data/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/forecasts")({
  head: () => ({
    meta: [
      { title: "Forecasts — Bharat Analytics AI" },
      { name: "description", content: "Revenue, sales, demand, expense and inventory forecasts from 7 days to 12 months, with uncertainty ranges." },
      { property: "og:title", content: "Forecasts — Bharat Analytics AI" },
      { property: "og:description", content: "Actual vs forecast with clearly labelled estimates." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Forecasts ds={ds} />}</NeedData>,
});

function Forecasts({ ds }: { ds: Dataset }) {
  const R = getRoles(ds);
  const filters = useStore((s) => s.filters);
  const dates = ds.columns.filter((c) => c.type === "date");
  const nums = ds.columns.filter((c) => c.type === "number" && c.role !== "sensitive");
  const [dateCol, setDateCol] = useState(R.date?.name ?? dates[0]?.name ?? "");
  const [valCol, setValCol] = useState(R.revenue?.name ?? nums[0]?.name ?? "");
  const [h, setH] = useState<Horizon>("3m");
  const fc = useMemo(() => (dateCol && valCol ? forecast(ds, dateCol, valCol, h, filters) : null), [ds, dateCol, valCol, h, filters]);

  if (!dates.length || !nums.length) return <p className="text-sm text-muted-foreground">Forecasting needs a date column and a numeric column. This dataset doesn't have both.</p>;
  const future = fc?.points.filter((p) => p.actual == null) ?? [];
  return (
    <div>
      <PageHeader title="Forecasts" description="Forecasts are estimates based on past trend and seasonality — not guarantees." />
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-card">
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={valCol} onChange={(e) => setValCol(e.target.value)} aria-label="Measure">{nums.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <span className="text-sm text-muted-foreground">over</span>
        <select className="h-9 rounded-md border bg-background px-2 text-sm" value={dateCol} onChange={(e) => setDateCol(e.target.value)} aria-label="Date">{dates.map((c) => <option key={c.name}>{c.name}</option>)}</select>
        <div className="ml-auto flex rounded-md border p-0.5">
          {HORIZONS.map((x) => <button key={x.id} onClick={() => setH(x.id)} className={cn("rounded px-3 py-1 text-sm", h === x.id ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{x.label}</button>)}
        </div>
      </div>
      {fc?.error ? <div className="rounded-xl border bg-card p-6 text-sm shadow-card">{fc.error}</div> : fc && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border bg-card p-4 shadow-card lg:col-span-2">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold">Actual vs forecast — {valCol}<span className="rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase text-accent-foreground">Estimate</span></div>
            <ForecastChart points={fc.points.slice(-60)} valueKey={valCol} height={360} />
          </div>
          <div className="rounded-xl border bg-card p-4 shadow-card">
            <h3 className="text-sm font-semibold">Forecast values</h3>
            <p className="mb-2 text-xs text-muted-foreground">{fc.method} · {fc.historyPeriods} periods{fc.mape ? ` · typical past error ±${fc.mape.toFixed(0)}%` : ""}</p>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1">Period</th><th className="text-right">Estimate</th><th className="text-right">95% range</th></tr></thead>
              <tbody>{future.map((p) => <tr key={p.period} className="border-t"><td className="py-1.5">{/^\d{4}-\d{2}$/.test(p.period) ? monthLabel(p.period) : p.period}</td><td className="text-right font-mono text-xs">{formatValue(valCol, p.forecast)}</td><td className="text-right font-mono text-[11px] text-muted-foreground">{formatValue(valCol, p.lower)}–{formatValue(valCol, p.upper)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
