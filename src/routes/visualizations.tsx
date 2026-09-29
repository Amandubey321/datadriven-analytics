import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type DragEvent } from "react";
import { Bookmark, Hash, Calendar, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { NeedData } from "@/components/NeedData";
import { ChartCard, IconBtn } from "@/components/charts/ChartCard";
import { CHART_TYPES } from "@/components/charts/ChartView";
import { uid, useStore } from "@/lib/store";
import type { Agg, Bucket, ChartType, Dataset, QuerySpec } from "@/lib/data/types";
import { runQuery, specToSQL } from "@/lib/data/query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/visualizations")({
  head: () => ({
    meta: [
      { title: "Visualization Builder — Bharat Analytics AI" },
      { name: "description", content: "Drag columns to build bar, line, donut, pareto, treemap and more charts with SUM, AVG, COUNT, MEDIAN and DISTINCT." },
      { property: "og:title", content: "Visualization Builder — Bharat Analytics AI" },
      { property: "og:description", content: "Drag-and-drop chart builder for business data." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Builder ds={ds} />}</NeedData>,
});

const AGGS: Agg[] = ["sum", "avg", "count", "min", "max", "median", "distinct"];
type Zone = "x" | "y" | "color";

function Builder({ ds }: { ds: Dataset }) {
  const cols = ds.columns.filter((c) => c.role !== "sensitive");
  const firstNum = cols.find((c) => c.type === "number");
  const firstCat = cols.find((c) => c.type === "category") ?? cols.find((c) => c.type === "date");
  const [x, setX] = useState(firstCat?.name ?? "");
  const [y, setY] = useState(firstNum?.name ?? "");
  const [color, setColor] = useState("");
  const [agg, setAgg] = useState<Agg>("sum");
  const [bucket, setBucket] = useState<Bucket>("month");
  const [chart, setChart] = useState<ChartType>("bar");
  const [fCol, setFCol] = useState("");
  const [fVal, setFVal] = useState("");
  const [limit, setLimit] = useState(20);
  const save = useStore((s) => s.save);
  const xIsDate = cols.find((c) => c.name === x)?.type === "date";

  const spec: QuerySpec | null = y ? {
    groupBy: x || undefined, bucket: xIsDate ? bucket : undefined, series: color || undefined,
    metrics: [{ column: y, agg }], filters: fCol && fVal ? [{ column: fCol, op: "eq", value: fVal }] : [],
    limit: xIsDate ? undefined : limit, chart,
  } : null;
  const result = useMemo(() => { try { return spec ? runQuery(ds, spec) : null; } catch { return null; } }, [ds, JSON.stringify(spec)]); // eslint-disable-line react-hooks/exhaustive-deps
  const fVals = useMemo(() => (fCol ? [...new Set(ds.rows.map((r) => r[fCol]).filter((v) => v != null).map(String))].sort().slice(0, 300) : []), [ds, fCol]);

  const onDrop = (zone: Zone) => (e: DragEvent) => {
    e.preventDefault();
    const name = e.dataTransfer.getData("text/col");
    if (!name) return;
    if (zone === "x") setX(name); else if (zone === "y") setY(name); else setColor(name);
  };

  return (
    <div>
      <PageHeader title="Visualization builder" description="Drag columns into X, Y and Colour — or pick from the menus. Change chart type instantly." />
      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-xl border bg-card p-3 shadow-card">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Columns</div>
          <ul className="max-h-[560px] space-y-1 overflow-auto">
            {cols.map((c) => {
              const Icon = c.type === "number" ? Hash : c.type === "date" ? Calendar : Tag;
              return (
                <li key={c.name} draggable onDragStart={(e) => e.dataTransfer.setData("text/col", c.name)}
                  className="flex cursor-grab items-center gap-2 rounded-md border bg-background px-2 py-1.5 text-sm active:cursor-grabbing">
                  <Icon className={cn("size-3.5", c.type === "number" ? "text-chart-1" : c.type === "date" ? "text-chart-3" : "text-saffron")} />
                  <span className="truncate">{c.name}</span>
                </li>
              );
            })}
          </ul>
        </aside>
        <div className="space-y-4">
          <div className="grid gap-3 rounded-xl border bg-card p-3 shadow-card sm:grid-cols-2 xl:grid-cols-4">
            <DropZone label="X-axis / group" value={x} onDrop={onDrop("x")} onClear={() => setX("")} options={cols.map((c) => c.name)} onPick={setX} />
            <DropZone label="Y-axis / measure" value={y} onDrop={onDrop("y")} options={cols.map((c) => c.name)} onPick={setY}>
              <select value={agg} onChange={(e) => setAgg(e.target.value as Agg)} className="mt-1 h-7 w-full rounded border bg-background px-1 text-xs" aria-label="Aggregation">{AGGS.map((a) => <option key={a} value={a}>{a.toUpperCase()}</option>)}</select>
            </DropZone>
            <DropZone label="Colour / series" value={color} onDrop={onDrop("color")} onClear={() => setColor("")} options={cols.map((c) => c.name)} onPick={setColor} />
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Filter</div>
              <select value={fCol} onChange={(e) => { setFCol(e.target.value); setFVal(""); }} className="h-8 w-full rounded border bg-background px-1 text-xs" aria-label="Filter column"><option value="">No filter</option>{cols.filter((c) => c.type === "category").map((c) => <option key={c.name}>{c.name}</option>)}</select>
              {fCol && <select value={fVal} onChange={(e) => setFVal(e.target.value)} className="h-8 w-full rounded border bg-background px-1 text-xs" aria-label="Filter value"><option value="">Any</option>{fVals.map((v) => <option key={v}>{v}</option>)}</select>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CHART_TYPES.map((t) => <button key={t.id} onClick={() => setChart(t.id)} className={cn("rounded-full border px-3 py-1 text-xs", chart === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-saffron")}>{t.label}</button>)}
            {xIsDate && <select value={bucket} onChange={(e) => setBucket(e.target.value as Bucket)} className="ml-2 h-7 rounded border bg-background px-1 text-xs" aria-label="Date grouping">{(["day", "week", "month", "quarter", "year", "monthOfYear"] as Bucket[]).map((b) => <option key={b} value={b}>{b === "monthOfYear" ? "month of year" : b}</option>)}</select>}
            {!xIsDate && <select value={limit} onChange={(e) => setLimit(+e.target.value)} className="ml-2 h-7 rounded border bg-background px-1 text-xs" aria-label="Top N">{[5, 10, 20, 50, 200].map((n) => <option key={n} value={n}>Top {n}</option>)}</select>}
          </div>
          {result && spec ? (
            <ChartCard title={`${agg === "sum" ? "" : agg.toUpperCase() + " "}${y}${x ? ` by ${x}` : ""}${color ? ` and ${color}` : ""}`} subtitle={`${result.rowsScanned.toLocaleString("en-IN")} rows`} type={chart} data={result} method={specToSQL(spec)} height={chart === "hbar" ? Math.max(320, result.rows.length * 24) : 380}
              actions={<IconBtn label="Save analysis" onClick={() => { save({ id: uid(), datasetId: ds.id, title: `${y} by ${x || "total"}`, spec, createdAt: Date.now() }); toast.success("Saved"); }}><Bookmark className="size-4" /></IconBtn>} />
          ) : <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">Drop a measure on the Y-axis to start.</div>}
          {chart === "scatter" && <p className="text-xs text-muted-foreground">Tip: for scatter/bubble charts, the builder plots aggregated groups. Use the AI Analyst for “sales vs profit” style questions.</p>}
        </div>
      </div>
    </div>
  );
}

function DropZone({ label, value, onDrop, onClear, options, onPick, children }: { label: string; value: string; onDrop: (e: DragEvent) => void; onClear?: () => void; options: string[]; onPick: (v: string) => void; children?: React.ReactNode }) {
  const [over, setOver] = useState(false);
  return (
    <div onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={(e) => { setOver(false); onDrop(e); }}
      className={cn("rounded-lg border-2 border-dashed p-2", over ? "border-saffron bg-accent/50" : "border-border")}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1">
        <select value={value} onChange={(e) => onPick(e.target.value)} className="h-7 min-w-0 flex-1 rounded border bg-background px-1 text-xs" aria-label={label}><option value="">—</option>{options.map((o) => <option key={o}>{o}</option>)}</select>
        {value && onClear && <button onClick={onClear} aria-label={`Clear ${label}`} className="text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>}
      </div>
      {children}
    </div>
  );
}
