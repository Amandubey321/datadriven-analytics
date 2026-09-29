import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { FileDown, FileSpreadsheet, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { NeedData } from "@/components/NeedData";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { InsightList } from "@/components/InsightList";
import { useStore } from "@/lib/store";
import type { Dataset, QueryResult } from "@/lib/data/types";
import { applyFilters, downloadBlob, runQuery, toCSV } from "@/lib/data/query";
import { computeKPIs, detectAnomalies, formatKPI, generateInsights, getRoles } from "@/lib/data/analytics";
import { forecast } from "@/lib/data/forecast";
import { formatValue } from "@/lib/data/format";
import { explainData } from "@/lib/ai.functions";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Bharat Analytics AI" },
      { name: "description", content: "Generate business reports with executive summary, KPIs, revenue, product, regional and trend analysis, anomalies and forecast. Export to PDF, Excel and CSV." },
      { property: "og:title", content: "Reports — Bharat Analytics AI" },
      { property: "og:description", content: "Professional business reports from your data." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Report ds={ds} />}</NeedData>,
});

function Report({ ds }: { ds: Dataset }) {
  const { filters, industry, company } = useStore();
  const rows = useMemo(() => applyFilters(ds.rows, filters), [ds, filters]);
  const fds = useMemo(() => ({ ...ds, rows }), [ds, rows]);
  const R = getRoles(ds);
  const V = R.revenue?.name;
  const { kpis, previousLabel } = useMemo(() => computeKPIs(ds, rows, industry), [ds, rows, industry]);
  const insights = useMemo(() => generateInsights(ds, rows), [ds, rows]);
  const anomalies = useMemo(() => detectAnomalies(ds, rows, 10), [ds, rows]);
  const explain = useServerFn(explainData);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const q = (groupBy: string | undefined, metric: string | undefined, extra: object = {}): QueryResult | null => {
    if (!groupBy || !metric) return null;
    try { return runQuery(fds, { groupBy, metrics: [{ column: metric, agg: "sum" }], chart: "bar", ...extra }); } catch { return null; }
  };
  const sections: { title: string; type: "area" | "hbar" | "bar" | "donut" | "combo"; data: QueryResult | null }[] = [
    { title: "Revenue analysis — monthly trend", type: "area", data: q(R.date?.name, V, { bucket: "month" }) },
    { title: "Sales analysis — volume by month", type: "bar", data: q(R.date?.name, R.quantity?.name, { bucket: "month" }) },
    { title: "Profit analysis — by product", type: "hbar", data: q((R.product ?? R.category)?.name, R.profit?.name, { limit: 12 }) },
    { title: "Customer analysis — top 10 customers", type: "hbar", data: q(R.customer?.name, V, { limit: 10 }) },
    { title: "Product analysis — revenue share", type: "donut", data: q((R.category ?? R.product)?.name, V, { limit: 10 }) },
    { title: "Regional analysis — by state", type: "hbar", data: q((R.state ?? R.region ?? R.city)?.name, V, { limit: 15 }) },
    { title: "Trend analysis — quarterly", type: "bar", data: q(R.date?.name, V, { bucket: "quarter" }) },
  ];
  const fc = R.date && V ? forecast(fds, R.date.name, V, "6m") : null;

  const genSummary = async () => {
    setBusy(true);
    try {
      const facts = [...kpis.map((k) => `${k.label}: ${formatKPI(k)}${k.change != null ? ` (${k.change.toFixed(1)}% vs ${previousLabel})` : ""}`), ...insights.map((i) => i.text)];
      const r = await explain({ data: { mode: "summary", facts: facts.slice(0, 40), table: [] } });
      if (r.ok) setSummary(r.data); else toast.error(r.error);
    } catch { toast.error("Couldn't reach the AI."); } finally { setBusy(false); }
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpis.map((k) => ({ KPI: k.label, Current: k.value, Previous: k.previous, "Change %": k.change }))), "KPIs");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(insights.map((i) => ({ Type: i.kind, Insight: i.text, Basis: i.basis }))), "Insights");
    sections.forEach((s) => s.data && XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s.data.rows), s.title.split("—")[0].trim().slice(0, 28)));
    if (fc && !fc.error) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fc.points), "Forecast (estimate)");
    XLSX.writeFile(wb, `${ds.name}-report.xlsx`);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Business report" description={`${company} · ${ds.name} · generated ${new Date().toLocaleDateString("en-IN")}`}>
        <Button variant="outline" onClick={genSummary} disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}Write executive summary</Button>
        <Button onClick={() => window.print()}><Printer className="size-4" />PDF</Button>
        <Button variant="outline" onClick={exportExcel}><FileSpreadsheet className="size-4" />Excel</Button>
        <Button variant="outline" onClick={() => downloadBlob(toCSV(kpis.map((k) => ({ KPI: k.label, Current: k.value, Previous: k.previous, "Change %": k.change }))), `${ds.name}-kpis.csv`, "text/csv")}><FileDown className="size-4" />CSV</Button>
      </PageHeader>

      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="mb-2 font-semibold">Executive summary</h2>
        {summary ? <div className="prose-ai text-sm"><ReactMarkdown>{summary}</ReactMarkdown></div> : <p className="text-sm text-muted-foreground">Click “Write executive summary” to have the AI summarise the computed figures below.</p>}
      </section>

      <h2 className="mb-3 mt-6 font-semibold">Key KPIs</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{kpis.slice(0, 8).map((k) => <KpiCard key={k.id} k={k} previousLabel={previousLabel} />)}</div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sections.filter((s) => s.data && s.data.rows.length).map((s) => <ChartCard key={s.title} title={s.title} type={s.type} data={s.data!} height={s.type === "hbar" ? Math.max(260, s.data!.rows.length * 22) : 260} />)}
      </div>

      <section className="print-break mt-6 rounded-xl border bg-card p-5 shadow-card">
        <h2 className="mb-2 font-semibold">Anomalies</h2>
        {anomalies.length ? <ul className="text-sm">{anomalies.map((a, i) => <li key={i} className="border-t py-1.5 first:border-0">{a.column} = <b>{formatValue(a.column, a.value, false)}</b> — {a.reason}{R.date ? ` · ${a.row[R.date.name]}` : ""}</li>)}</ul> : <p className="text-sm text-muted-foreground">None found.</p>}
      </section>

      {fc && !fc.error && (
        <section className="mt-6 rounded-xl border bg-card p-5 shadow-card">
          <h2 className="font-semibold">Forecast — next 6 months <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[10px] uppercase text-accent-foreground">Estimate</span></h2>
          <p className="mb-2 text-xs text-muted-foreground">{fc.method}. Shaded area is the 95% range.</p>
          <ForecastChart points={fc.points.slice(-24)} valueKey={V!} height={280} />
        </section>
      )}

      <section className="mt-6 rounded-xl border bg-card p-5 shadow-card">
        <h2 className="mb-3 font-semibold">AI insights & recommendations</h2>
        <InsightList insights={insights} />
      </section>
      <p className="mt-4 text-xs text-muted-foreground">All figures computed directly from the dataset. Forecasts are statistical estimates. PowerPoint export: print to PDF and insert, or download chart PNGs from each card.</p>
    </div>
  );
}
