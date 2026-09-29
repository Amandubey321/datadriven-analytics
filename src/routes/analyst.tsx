import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowUp, Bookmark, ChevronDown, Code2, Download, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { NeedData } from "@/components/NeedData";
import { ChartCard } from "@/components/charts/ChartCard";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Logo } from "@/components/Logo";
import { uid, useStore, type ChatMsg } from "@/lib/store";
import type { ChartType, Dataset, QuerySpec } from "@/lib/data/types";
import { planQuestion, explainData } from "@/lib/ai.functions";
import { buildAiContext } from "@/lib/data/context";
import { downloadBlob, runQuery, specToSQL, toCSV } from "@/lib/data/query";
import { forecast, HORIZONS, type Horizon } from "@/lib/data/forecast";
import { computeKPIs, formatKPI, generateInsights } from "@/lib/data/analytics";
import { formatValue } from "@/lib/data/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/analyst")({
  head: () => ({
    meta: [
      { title: "AI Analyst — Bharat Analytics AI" },
      { name: "description", content: "Ask questions about your business data in plain English and get charts, calculations and explanations." },
      { property: "og:title", content: "AI Analyst — Bharat Analytics AI" },
      { property: "og:description", content: "Natural-language analysis of your sales, finance and HR data." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Analyst ds={ds} />}</NeedData>,
});

const SUGGESTIONS = [
  "Show me monthly sales", "Which state generated the highest revenue?", "Which products are losing money?",
  "Compare sales between Maharashtra and Madhya Pradesh", "Why did revenue decrease in August?", "Show my top 10 customers",
  "Calculate month-over-month growth", "Predict next month's sales", "Give me a management summary",
];

const CHARTS: ChartType[] = ["bar", "hbar", "grouped", "stacked", "line", "area", "pie", "donut", "scatter", "combo", "pareto", "treemap", "funnel", "table", "kpi"];

function normalizeSpec(raw: unknown): QuerySpec | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<QuerySpec>;
  if (!Array.isArray(s.metrics) || !s.metrics.length) return null;
  return {
    groupBy: s.groupBy || undefined,
    bucket: s.bucket || undefined,
    series: s.series || undefined,
    metrics: s.metrics.filter((m) => m && m.column && m.agg),
    filters: Array.isArray(s.filters) ? s.filters.filter((f) => f && f.column && f.op) : [],
    sort: s.sort?.by ? s.sort : undefined,
    limit: typeof s.limit === "number" ? Math.min(500, s.limit) : undefined,
    chart: CHARTS.includes(s.chart as ChartType) ? (s.chart as ChartType) : "bar",
  };
}

function Analyst({ ds }: { ds: Dataset }) {
  const { chats, pushMsg, patchMsg, clearChat, aiMode, save, industry } = useStore();
  const msgs = chats[ds.id] ?? [];
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const plan = useServerFn(planQuestion);
  const explain = useServerFn(explainData);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const ctx = useMemo(() => buildAiContext(ds, aiMode), [ds, aiMode]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length, busy]);
  useEffect(() => { if (!busy) taRef.current?.focus(); }, [busy]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    pushMsg(ds.id, { id: uid(), role: "user", text: q });
    const id = uid();
    pushMsg(ds.id, { id, role: "assistant", text: "", status: "thinking" });
    const fail = (text: string) => patchMsg(ds.id, id, { status: "error", text });
    try {
      const history = msgs.slice(-8).map((m) => ({ role: m.role, text: m.text.slice(0, 400), spec: m.spec }));
      const res = await plan({ data: { question: q, ...ctx, history } });
      if (!res.ok) return fail(res.error);
      const p = JSON.parse(res.data) as { action?: string; title?: string; message?: string; columnsUsed?: string[]; spec?: unknown; forecast?: { dateColumn: string; valueColumn: string; horizon: string } };
      const action = p.action ?? "query";

      if (action === "clarify" || action === "insufficient") {
        return patchMsg(ds.id, id, { status: "done", kind: action, text: p.message ?? "I couldn't answer that from this dataset." });
      }
      if (action === "export") {
        const last = [...msgs].reverse().find((m) => m.result);
        if (!last) return patchMsg(ds.id, id, { status: "done", kind: "insufficient", text: "There's no result to export yet. Ask a question first, or open **Reports** for a full report." });
        return patchMsg(ds.id, id, { status: "done", kind: "export", text: `Your export for **${last.title}** is ready below. For a full multi-section report, open the Reports page.`, result: last.result, spec: last.spec, title: last.title });
      }
      if (action === "summary") {
        const { kpis, previousLabel } = computeKPIs(ds, ds.rows, industry);
        const facts = [...kpis.map((k) => `${k.label}: ${formatKPI(k)}${k.change != null ? ` (${k.change.toFixed(1)}% vs ${previousLabel})` : ""}`), ...generateInsights(ds, ds.rows).map((i) => i.text)];
        const r = await explain({ data: { mode: "summary", question: q, facts: facts.slice(0, 40), table: [] } });
        return r.ok ? patchMsg(ds.id, id, { status: "done", kind: "summary", text: r.data }) : fail(r.error);
      }
      if (action === "forecast" && p.forecast) {
        const h = (HORIZONS.find((x) => x.id === p.forecast!.horizon)?.id ?? "3m") as Horizon;
        let fc;
        try { fc = forecast(ds, p.forecast.dateColumn, p.forecast.valueColumn, h); } catch { fc = null; }
        if (!fc) return fail("Couldn't build a forecast with those columns.");
        if (fc.error) return patchMsg(ds.id, id, { status: "done", kind: "insufficient", text: fc.error });
        const future = fc.points.filter((x) => x.actual == null);
        const r = await explain({ data: { mode: "answer", question: q, method: `${fc.method}; ${fc.historyPeriods} periods of history; 95% band from residuals${fc.mape ? `; in-sample MAPE ${fc.mape.toFixed(1)}%` : ""}. These are ESTIMATES.`, table: [...fc.points.filter((x) => x.actual != null).slice(-6), ...future].slice(0, 40) as never } });
        return patchMsg(ds.id, id, { status: "done", kind: "forecast", forecast: { ...p.forecast, horizon: h }, title: p.title ?? "Forecast", columnsUsed: [p.forecast.dateColumn, p.forecast.valueColumn], text: r.ok ? r.data : `Forecast computed with ${fc.method}. (AI explanation unavailable: ${r.error})` });
      }

      const spec = normalizeSpec(p.spec);
      if (!spec) return fail("I couldn't turn that into a calculation. Try naming the measure and the grouping, e.g. “revenue by state”.");
      let result;
      try { result = runQuery(ds, spec); } catch (e) { return patchMsg(ds.id, id, { status: "done", kind: "insufficient", text: e instanceof Error ? e.message : "The calculation failed." }); }
      if (!result.rows.length) return patchMsg(ds.id, id, { status: "done", kind: "insufficient", spec, result, title: p.title, text: "No rows match those conditions, so there's nothing to show. Check the filters (e.g. spelling of a state or date range)." });
      const r = await explain({ data: { mode: "answer", question: q, title: p.title, method: `${specToSQL(spec)} — scanned ${result.rowsScanned} rows`, table: result.rows.slice(0, 40) } });
      patchMsg(ds.id, id, { status: "done", kind: "query", spec, result, title: p.title ?? "Result", columnsUsed: p.columnsUsed, text: r.ok ? r.data : `Here is the computed result. (AI explanation unavailable: ${r.error})` });
    } catch {
      fail("Couldn't reach the AI. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-5xl flex-col">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">AI Analyst</h1>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-positive" />Numbers are calculated by the app on “{ds.name}”. The AI plans the query and explains the result. {aiMode === "aggregates" ? "Raw rows are not shared with the AI." : "Personal identifiers are never shared."}</p>
        </div>
        {msgs.length > 0 && <Button variant="ghost" size="sm" onClick={() => clearChat(ds.id)}><RotateCcw className="size-4" />New conversation</Button>}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto pb-4 pr-1">
        {msgs.length === 0 && (
          <div className="rounded-xl border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3"><Logo className="size-9" /><div><div className="font-semibold">Ask anything about your data</div><div className="text-sm text-muted-foreground">Follow-ups keep context — e.g. “now only show Rajasthan”, “compare with last year”.</div></div></div>
            <div className="mt-4 flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border bg-secondary/60 px-3 py-1.5 text-xs hover:border-saffron">{s}</button>)}
            </div>
          </div>
        )}
        {msgs.map((m) => <Message key={m.id} m={m} ds={ds} onSave={(m) => { if (m.spec) { save({ id: uid(), datasetId: ds.id, title: m.title ?? "Analysis", spec: m.spec, note: m.text, createdAt: Date.now(), question: msgs[msgs.indexOf(m) - 1]?.text }); toast.success("Saved to Saved Analyses"); } }} onChart={(c) => patchMsg(ds.id, m.id, { spec: { ...m.spec!, chart: c } })} />)}
        <div ref={endRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="rounded-xl border bg-card p-2 shadow-card">
        <Textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
          placeholder="e.g. Which state generated the highest revenue last quarter?" rows={2} className="resize-none border-0 shadow-none focus-visible:ring-0" autoFocus />
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>
          <Button type="submit" size="icon" className="size-8" disabled={busy || !input.trim()} aria-label="Send">{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}</Button>
        </div>
      </form>
    </div>
  );
}

function Message({ m, ds, onSave, onChart }: { m: ChatMsg; ds: Dataset; onSave: (m: ChatMsg) => void; onChart: (c: ChartType) => void }) {
  const [inspect, setInspect] = useState(false);
  if (m.role === "user") return <div className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2 text-sm text-primary-foreground">{m.text}</div>;
  if (m.status === "thinking") return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin text-saffron" />Planning the calculation and running it on your data…</div>;
  const fc = m.forecast ? forecast(ds, m.forecast.dateColumn, m.forecast.valueColumn, m.forecast.horizon as Horizon) : null;
  return (
    <div className="space-y-3">
      <div className={cn("prose-ai max-w-none text-sm", m.status === "error" && "text-destructive")}><ReactMarkdown>{m.text}</ReactMarkdown></div>
      {m.result && m.spec && m.result.rows.length > 0 && (
        <ChartCard title={m.title ?? "Result"} subtitle={`${m.result.rowsScanned.toLocaleString("en-IN")} rows scanned`} type={m.spec.chart} data={m.result} method={specToSQL(m.spec)} height={m.spec.chart === "hbar" ? Math.max(260, m.result.rows.length * 24) : 300}
          actions={
            <>
              <select value={m.spec.chart} onChange={(e) => onChart(e.target.value as ChartType)} className="h-7 rounded-md border bg-background px-1 text-xs" aria-label="Chart type">
                {CHARTS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button title="Save analysis" aria-label="Save analysis" onClick={() => onSave(m)} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"><Bookmark className="size-4" /></button>
            </>
          }
          footer={
            <div className="mt-3 border-t pt-2" data-noexport="true">
              <button onClick={() => setInspect((v) => !v)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"><Code2 className="size-3.5" />Inspect calculation<ChevronDown className={cn("size-3.5 transition-transform", inspect && "rotate-180")} /></button>
              {inspect && (
                <div className="mt-2 space-y-2 text-xs">
                  <div><span className="text-muted-foreground">Source columns: </span>{(m.columnsUsed?.length ? m.columnsUsed : [m.spec.groupBy, m.spec.series, ...m.spec.metrics.map((x) => x.column)].filter(Boolean)).map((c) => <span key={c} className="mr-1 rounded bg-secondary px-1.5 py-0.5 font-mono">{c}</span>)}</div>
                  <pre className="overflow-auto rounded-md bg-secondary p-3 font-mono text-[11px] leading-relaxed">{specToSQL(m.spec)}</pre>
                  <div className="max-h-56 overflow-auto rounded-md border">
                    <table className="w-full"><thead className="sticky top-0 bg-secondary"><tr>{[m.result.labelKey, ...m.result.valueKeys].map((k) => <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>)}</tr></thead>
                      <tbody>{m.result.rows.map((r, i) => <tr key={i} className="border-t"><td className="px-2 py-1">{String(r[m.result!.labelKey])}</td>{m.result!.valueKeys.map((k) => <td key={k} className="px-2 py-1 text-right font-mono">{formatValue(k, r[k], false)}</td>)}</tr>)}</tbody></table>
                  </div>
                </div>
              )}
            </div>
          }
        />
      )}
      {m.kind === "export" && m.result && (
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => downloadBlob(toCSV(m.result!.rows), `${(m.title ?? "result").replace(/\W+/g, "-")}.csv`, "text/csv")}><Download className="size-4" />Download CSV</Button></div>
      )}
      {fc && !fc.error && (
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <div className="mb-2 text-sm font-semibold">{m.title} <span className="ml-1 rounded bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent-foreground">Estimate</span></div>
          <ForecastChart points={fc.points.slice(-30)} valueKey={m.forecast!.valueColumn} />
          <p className="mt-1 text-xs text-muted-foreground">{fc.method} · {fc.historyPeriods} periods of history{fc.mape ? ` · typical error ±${fc.mape.toFixed(0)}%` : ""}</p>
        </div>
      )}
    </div>
  );
}
