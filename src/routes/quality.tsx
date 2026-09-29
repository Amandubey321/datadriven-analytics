import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Wand2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/AppShell";
import { NeedData } from "@/components/NeedData";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { Dataset } from "@/lib/data/types";
import { cleanDataset, profileDataset } from "@/lib/data/quality";
import { formatValue } from "@/lib/data/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quality")({
  head: () => ({
    meta: [
      { title: "Data Quality — Bharat Analytics AI" },
      { name: "description", content: "Automatic data-quality report: missing values, duplicates, invalid dates, outliers and inconsistent categories, with one-click cleaning." },
      { property: "og:title", content: "Data Quality — Bharat Analytics AI" },
      { property: "og:description", content: "Find and fix data problems before analysis." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Quality ds={ds} />}</NeedData>,
});

function Quality({ ds }: { ds: Dataset }) {
  const rep = useMemo(() => profileDataset(ds), [ds]);
  const { replaceDataset, cleanLogs } = useStore();
  const log = cleanLogs[ds.id];
  const tone = rep.score >= 90 ? "text-positive" : rep.score >= 70 ? "text-warning" : "text-negative";
  const fixable = rep.duplicates + rep.emptyColumns.length + rep.inconsistentTotal + rep.invalidTotal > 0;

  const fix = () => {
    const { dataset, log } = cleanDataset(ds, rep);
    replaceDataset(dataset, log);
    toast.success(`Cleaned: ${log.map((l) => `${l.count} ${l.label.toLowerCase()}`).join(", ")}`);
  };

  const issues = [
    { label: "Missing values", value: rep.missingTotal },
    { label: "Duplicate rows", value: rep.duplicates },
    { label: "Invalid dates / numbers", value: rep.invalidTotal },
    { label: "Empty columns", value: rep.emptyColumns.length },
    { label: "Outliers", value: rep.outlierTotal },
    { label: "Inconsistent categories", value: rep.inconsistentTotal },
  ];

  return (
    <div>
      <PageHeader title="Data quality" description={`${ds.name} · ${rep.rows.toLocaleString("en-IN")} rows × ${rep.columns} columns`}>
        <Button onClick={fix} disabled={!fixable}><Wand2 className="size-4" />Fix automatically</Button>
        <Button asChild variant="outline"><Link to="/">Continue to dashboard</Link></Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-6 text-center shadow-card">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Data quality score</div>
          <div className={cn("mt-2 font-display text-6xl font-semibold", tone)}>{rep.score}<span className="text-2xl text-muted-foreground">/100</span></div>
          <p className="mt-2 text-xs text-muted-foreground">Automatic fixes never guess values: duplicates and blank rows are removed, spellings unified, and unreadable values left blank.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:col-span-3">
          {issues.map((i) => (
            <div key={i.label} className="rounded-xl border bg-card p-4 shadow-card">
              <div className="text-xs text-muted-foreground">{i.label}</div>
              <div className={cn("mt-1 font-display text-2xl font-semibold", i.value ? "text-foreground" : "text-positive")}>{i.value.toLocaleString("en-IN")}</div>
            </div>
          ))}
        </div>
      </div>

      {log && (
        <div className="mt-4 rounded-xl border border-positive/30 bg-card p-4 text-sm shadow-card">
          <div className="mb-1 flex items-center gap-2 font-semibold text-positive"><CheckCircle2 className="size-4" />Last automatic clean</div>
          <ul className="list-disc pl-5 text-muted-foreground">{log.length ? log.map((l) => <li key={l.label}>{l.label}: {l.count.toLocaleString("en-IN")}</li>) : <li>No changes were needed.</li>}</ul>
        </div>
      )}

      <div className="mt-6 overflow-auto rounded-xl border bg-card shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs text-muted-foreground">
            <tr>{["Column", "Detected type", "Meaning", "Missing", "Invalid", "Distinct", "Outliers", "Range / top values", "Issues"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rep.profiles.map((p) => (
              <tr key={p.name} className="border-t align-top">
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2"><span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px]">{p.type}</span></td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{p.role === "sensitive" ? "Personal data · masked" : p.role ?? "—"}</td>
                <td className={cn("px-3 py-2 font-mono text-xs", p.missing && "text-warning")}>{p.missing}</td>
                <td className={cn("px-3 py-2 font-mono text-xs", p.invalid && "text-negative")}>{p.invalid}</td>
                <td className="px-3 py-2 font-mono text-xs">{p.distinct}</td>
                <td className={cn("px-3 py-2 font-mono text-xs", p.outliers && "text-warning")}>{p.outliers}</td>
                <td className="max-w-64 px-3 py-2 text-xs text-muted-foreground">
                  {p.role === "sensitive" ? "hidden" : p.type === "number" ? `${formatValue(p.name, p.min)} → ${formatValue(p.name, p.max)}` : p.type === "date" ? `${p.min} → ${p.max}` : p.top.slice(0, 3).map((t) => `${t.value} (${t.count})`).join(", ")}
                </td>
                <td className="px-3 py-2 text-xs">{p.inconsistent.length ? <span className="text-warning">{p.inconsistent.length} spelling variants, e.g. {p.inconsistent[0].map((v) => `"${v}"`).join(" / ")}</span> : rep.emptyColumns.includes(p.name) ? <span className="text-negative">Empty column</span> : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
