import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Upload, PlayCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { useActiveDataset, useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/FilterBar";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { InsightList } from "@/components/InsightList";
import { useDemoLauncher, UploadZone } from "@/components/UploadZone";
import { Logo } from "@/components/Logo";
import type { Dataset } from "@/lib/data/types";
import { computeKPIs, detectAnomalies, formatKPI, generateInsights, getRoles } from "@/lib/data/analytics";
import { applyFilters, runQuery } from "@/lib/data/query";
import { forecast } from "@/lib/data/forecast";
import { formatValue } from "@/lib/data/format";
import { explainData } from "@/lib/ai.functions";
import { INDUSTRIES } from "@/lib/data/industries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bharat Analytics AI — Business intelligence for Indian companies" },
      { name: "description", content: "Upload sales, finance or HR data and get an AI analyst, KPI dashboards in ₹ Lakh/Crore, insights, forecasts and reports." },
      { property: "og:title", content: "Bharat Analytics AI — Turn your business data into decisions" },
      { property: "og:description", content: "AI analyst, dashboards, data cleaning, forecasting and reports designed for Indian businesses." },
    ],
  }),
  component: Index,
});

function Index() {
  const hydrated = useStore((s) => s.hydrated);
  const ds = useActiveDataset();
  if (!hydrated) return <div className="flex h-64 items-center justify-center"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>;
  return ds ? <Dashboard ds={ds} /> : <Welcome />;
}

function Welcome() {
  const demo = useDemoLauncher();
  const [showUpload, setShowUpload] = useState(false);
  return (
    <div className="mx-auto max-w-4xl py-10">
      <div className="rounded-2xl border bg-card p-8 shadow-card sm:p-12">
        <Logo className="size-12" />
        <h1 className="mt-6 text-4xl font-semibold sm:text-5xl">Welcome to Bharat Analytics <span className="text-saffron">AI</span></h1>
        <p className="mt-3 text-lg text-muted-foreground">Turn your business data into decisions.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => setShowUpload((v) => !v)}><Upload className="size-4" />Upload Your Data</Button>
          <Button size="lg" variant="outline" onClick={demo.start}><PlayCircle className="size-4" />Try Demo Dataset</Button>
        </div>
        {showUpload && <div className="mt-6"><UploadZone compact /></div>}
        <ol className="mt-10 grid gap-2 text-xs text-muted-foreground sm:grid-cols-7">
          {["Upload", "Analysis", "Dashboard", "AI insights", "Visualisation", "Forecast", "Report"].map((s, i) => (
            <li key={s} className="flex items-center gap-2 rounded-md border bg-secondary/60 px-2 py-1.5"><span className="font-mono text-saffron">{i + 1}</span>{s}</li>
          ))}
        </ol>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">Figures shown in ₹ with Indian formatting (₹1,25,000 · ₹12.5 L · ₹4.2 Cr). Personal identifiers like PAN and phone numbers are masked and never sent to the AI.</p>
      {demo.node}
    </div>
  );
}

function Dashboard({ ds }: { ds: Dataset }) {
  const { filters, industry } = useStore();
  const rows = useMemo(() => applyFilters(ds.rows, filters), [ds, filters]);
  const fds = useMemo(() => ({ ...ds, rows }), [ds, rows]);
  const R = getRoles(ds);
  const { kpis, previousLabel, currentLabel } = useMemo(() => computeKPIs(ds, rows, industry), [ds, rows, industry]);
  const insights = useMemo(() => generateInsights(ds, rows), [ds, rows]);
  const anomalies = useMemo(() => detectAnomalies(ds, rows, 8), [ds, rows]);
  const V = R.revenue?.name;

  const safe = (f: () => ReturnType<typeof runQuery> | null) => { try { return f(); } catch { return null; } };
  const revTrend = useMemo(() => safe(() => (R.date && V ? runQuery(fds, { groupBy: R.date.name, bucket: "month", metrics: [{ column: V, agg: "sum" }], chart: "area" }) : null)), [fds]); // eslint-disable-line react-hooks/exhaustive-deps
  const salesTrend = useMemo(() => safe(() => (R.date ? runQuery(fds, { groupBy: R.date.name, bucket: "month", metrics: [R.quantity ? { column: R.quantity.name, agg: "sum" } : R.order ? { column: R.order.name, agg: "distinct" } : { column: R.date.name, agg: "count" }], chart: "bar" }) : null)), [fds]); // eslint-disable-line react-hooks/exhaustive-deps
  const dim = R.product ?? R.category ?? R.department;
  const profitBy = useMemo(() => safe(() => (dim && (R.profit || V) ? runQuery(fds, { groupBy: dim.name, metrics: R.profit && V ? [{ column: V, agg: "sum" }, { column: R.profit.name, agg: "sum" }] : [{ column: (R.profit ?? R.revenue)!.name, agg: "sum" }], limit: 12, chart: "combo" }) : null)), [fds]); // eslint-disable-line react-hooks/exhaustive-deps
  const geo = R.state ?? R.region ?? R.city;
  const regional = useMemo(() => safe(() => (geo && V ? runQuery(fds, { groupBy: geo.name, metrics: [{ column: V, agg: "sum" }], limit: 15, chart: "hbar" }) : null)), [fds]); // eslint-disable-line react-hooks/exhaustive-deps
  const fc = useMemo(() => (R.date && V ? forecast(fds, R.date.name, V, "3m") : null), [fds]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Executive dashboard</h1>
          <p className="text-sm text-muted-foreground">{INDUSTRIES[industry].name} view · {currentLabel}{previousLabel ? ` vs ${previousLabel}` : ""} · {rows.length.toLocaleString("en-IN")} records</p>
        </div>
        <div className="no-print flex gap-2">
          <Button asChild variant="outline" size="sm"><Link to="/data"><Upload className="size-4" />Upload data</Link></Button>
          <Button asChild variant="outline" size="sm"><Link to="/reports">Generate report</Link></Button>
          <Button asChild size="sm"><Link to="/analyst">Ask the AI Analyst<ArrowRight className="size-4" /></Link></Button>
        </div>
      </div>
      <FilterBar ds={ds} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {kpis.slice(0, 12).map((k) => <KpiCard key={k.id} k={k} previousLabel={previousLabel} />)}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {revTrend && <ChartCard title={`${V} by month`} subtitle="Monthly total" type="area" data={revTrend} method={`SUM(${V}) grouped by month of ${R.date?.name}`} />}
        {salesTrend && <ChartCard title={`${salesTrend.valueKeys[0]} by month`} subtitle="Volume trend" type="bar" data={salesTrend} />}
        {profitBy && <ChartCard title={`${profitBy.valueKeys.join(" & ")} by ${dim?.name}`} subtitle="Top 12" type={profitBy.valueKeys.length > 1 ? "combo" : "bar"} data={profitBy} />}
        {regional && <ChartCard title={`${V} by ${geo?.name}`} subtitle="Regional performance" type="hbar" data={regional} height={Math.max(280, regional.rows.length * 24)} />}
      </div>

      <section className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">AI insights</h2>
            <ManagementSummary facts={[...kpis.map((k) => `${k.label}: ${formatKPI(k)}${k.change != null ? ` (${k.change.toFixed(1)}% vs ${previousLabel})` : ""}`), ...insights.map((i) => i.text)]} />
          </div>
          <InsightList insights={insights} />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-card">
          <h2 className="mb-3 font-semibold">Anomaly detection</h2>
          {anomalies.length === 0 ? <p className="text-sm text-muted-foreground">No unusual values found.</p> : (
            <ul className="divide-y text-sm">
              {anomalies.map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{String(a.row[R.order?.name ?? ""] ?? a.row[R.customer?.name ?? ""] ?? `Row`)}</div>
                    <div className="truncate text-xs text-muted-foreground">{[R.date && a.row[R.date.name], geo && a.row[geo.name], dim && a.row[dim.name]].filter(Boolean).join(" · ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-semibold">{formatValue(a.column, a.value)}</div>
                    <div className="text-[11px] text-negative">{a.reason}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {fc && !fc.error && (
        <div className="mt-6 rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <div><h3 className="text-sm font-semibold">{V} forecast — next 3 months</h3><p className="text-xs text-muted-foreground">Estimate · {fc.method} · shaded band = 95% range</p></div>
            <Button asChild variant="ghost" size="sm" className="no-print h-7 text-xs"><Link to="/forecasts">Open forecasts</Link></Button>
          </div>
          <ForecastChart points={fc.points.slice(-18)} valueKey={V!} height={260} />
        </div>
      )}
    </div>
  );
}

function ManagementSummary({ facts }: { facts: string[] }) {
  const explain = useServerFn(explainData);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const r = await explain({ data: { mode: "summary", facts: facts.slice(0, 40), table: [] } });
      if (r.ok) setText(r.data); else toast.error(r.error);
    } catch { toast.error("Couldn't reach the AI."); } finally { setBusy(false); }
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Management summary</Button>
      {text && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4" onClick={() => setText(null)}>
          <div className="max-h-[80vh] max-w-2xl overflow-auto rounded-xl bg-card p-6 shadow-card" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-semibold">Management summary</h3>
            <div className="prose-ai text-sm"><ReactMarkdown>{text}</ReactMarkdown></div>
            <p className="mt-3 text-xs text-muted-foreground">Written by AI from figures computed on your data.</p>
            <Button className="mt-4" size="sm" onClick={() => setText(null)}>Close</Button>
          </div>
        </div>
      )}
    </>
  );
}
