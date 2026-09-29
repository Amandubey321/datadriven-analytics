import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar, Hash, Type, ToggleLeft, Tag, Trash2, Download, EyeOff, Lock, Search, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { DemoGrid, UploadZone } from "@/components/UploadZone";
import { useActiveDataset, useStore } from "@/lib/store";
import type { Column, Dataset, Row } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { maskValue } from "@/lib/data/semantics";
import { formatINR, formatNum, isMoneyColumn } from "@/lib/data/format";
import { downloadBlob, toCSV } from "@/lib/data/query";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/data")({
  head: () => ({
    meta: [
      { title: "Data — Bharat Analytics AI" },
      { name: "description", content: "Upload CSV, Excel or JSON files, load demo datasets and explore your data in a spreadsheet view." },
      { property: "og:title", content: "Data — Bharat Analytics AI" },
      { property: "og:description", content: "Upload business data and explore it in a fast spreadsheet-style explorer." },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const { datasets, activeId, setActive, removeDataset } = useStore();
  const ds = useActiveDataset();
  return (
    <div>
      <PageHeader title="Data" description="Upload files, pick a demo, and explore rows. Files are processed in your browser and saved on this device." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2"><UploadZone /></div>
        <div className="rounded-xl border bg-card p-4 shadow-card">
          <h3 className="mb-2 text-sm font-semibold">Your datasets</h3>
          {datasets.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="space-y-1">
              {datasets.map((d) => (
                <li key={d.id} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm", d.id === activeId ? "bg-accent" : "hover:bg-secondary")}>
                  <button className="min-w-0 flex-1 truncate text-left" onClick={() => setActive(d.id)}>{d.name}<span className="ml-1 text-xs text-muted-foreground">· {d.rows.length.toLocaleString("en-IN")}</span></button>
                  <button aria-label={`Delete ${d.name}`} onClick={() => confirm(`Delete "${d.name}" from this device?`) && removeDataset(d.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 rounded-md bg-secondary p-2 text-xs text-muted-foreground">Database connections (PostgreSQL, MySQL) are planned. For now, export a table as CSV and upload it.</p>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Demo datasets</h2>
      <DemoGrid />
      {ds && <Explorer key={ds.id} ds={ds} />}
    </div>
  );
}

const TYPE_ICON: Record<Column["type"], typeof Hash> = { number: Hash, date: Calendar, category: Tag, text: Type, boolean: ToggleLeft };
const PAGE = 50;

function Explorer({ ds }: { ds: Dataset }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ col: string; dir: 1 | -1 } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [colFilter, setColFilter] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [freeze, setFreeze] = useState(true);
  const cols = ds.columns.filter((c) => !hidden.has(c.name));

  const indexed = useMemo(() => ds.rows.map((r, i) => ({ r, i })), [ds]);
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    let out = indexed;
    if (ql) out = out.filter(({ r }) => ds.columns.some((c) => c.role !== "sensitive" && String(r[c.name] ?? "").toLowerCase().includes(ql)));
    for (const [c, v] of Object.entries(colFilter)) if (v) out = out.filter(({ r }) => String(r[c] ?? "").toLowerCase().includes(v.toLowerCase()));
    if (sort) out = [...out].sort((a, b) => { const x = a.r[sort.col], y = b.r[sort.col]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * sort.dir; });
    return out;
  }, [indexed, q, sort, colFilter, ds.columns]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const view = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const cell = (c: Column, v: Row[string]) => {
    if (v == null || v === "") return <span className="text-muted-foreground/60">—</span>;
    if (c.role === "sensitive") return <span className="font-mono text-xs text-muted-foreground">{maskValue(v)}</span>;
    if (typeof v === "number") return <span className="font-mono text-xs">{isMoneyColumn(c.name) ? formatINR(v) : formatNum(v)}</span>;
    return String(v);
  };

  const exportRows = () => {
    const rows = (selected.size ? ds.rows.filter((_, i) => selected.has(i)) : filtered.map((x) => x.r)).map((r) => {
      const o: Row = {};
      for (const c of cols) o[c.name] = c.role === "sensitive" ? maskValue(r[c.name]) : r[c.name];
      return o;
    });
    downloadBlob(toCSV(rows, cols.map((c) => c.name)), `${ds.name}-export.csv`, "text/csv");
  };

  return (
    <section className="mt-8 rounded-xl border bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <h2 className="mr-2 font-semibold">Data explorer</h2>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Search all columns" className="h-9 w-56 pl-8" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><EyeOff className="size-4" />Columns ({cols.length}/{ds.columns.length})</Button></DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 overflow-auto">
            {ds.columns.map((c) => (
              <DropdownMenuCheckboxItem key={c.name} checked={!hidden.has(c.name)} onSelect={(e) => e.preventDefault()} onCheckedChange={(v) => setHidden((h) => { const n = new Set(h); if (v) n.delete(c.name); else n.add(c.name); return n; })}>{c.name}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant={freeze ? "secondary" : "outline"} size="sm" onClick={() => setFreeze((f) => !f)}><Lock className="size-4" />Freeze first column</Button>
        <Button variant="outline" size="sm" onClick={exportRows}><Download className="size-4" />Export {selected.size ? `${selected.size} selected` : `${filtered.length.toLocaleString("en-IN")} rows`}</Button>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length.toLocaleString("en-IN")} of {ds.rows.length.toLocaleString("en-IN")} rows</span>
      </div>
      <div className="max-h-[560px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-left text-xs">
            <tr>
              <th className="sticky left-0 z-20 w-8 bg-secondary px-2"><input type="checkbox" aria-label="Select page" checked={view.length > 0 && view.every((x) => selected.has(x.i))} onChange={(e) => setSelected((s) => { const n = new Set(s); view.forEach((x) => (e.target.checked ? n.add(x.i) : n.delete(x.i))); return n; })} /></th>
              {cols.map((c, ci) => {
                const Icon = TYPE_ICON[c.type];
                return (
                  <th key={c.name} className={cn("min-w-32 px-3 py-2 align-top font-medium", freeze && ci === 0 && "sticky left-8 z-20 bg-secondary")}>
                    <button className="flex items-center gap-1 whitespace-nowrap" onClick={() => setSort((s) => (s?.col === c.name ? { col: c.name, dir: (s.dir * -1) as 1 | -1 } : { col: c.name, dir: 1 }))}>
                      <Icon className="size-3 text-muted-foreground" />{c.name}{c.role === "sensitive" && <Lock className="size-3 text-saffron" />}<ArrowUpDown className="size-3 text-muted-foreground" />
                    </button>
                    <input value={colFilter[c.name] ?? ""} onChange={(e) => { setColFilter((f) => ({ ...f, [c.name]: e.target.value })); setPage(0); }} placeholder="Filter" className="mt-1 h-6 w-full rounded border bg-background px-1.5 text-[11px] font-normal" disabled={c.role === "sensitive"} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {view.map(({ r, i }) => (
              <tr key={i} className={cn("border-t hover:bg-secondary/50", selected.has(i) && "bg-accent/40")}>
                <td className="sticky left-0 bg-card px-2"><input type="checkbox" aria-label={`Select row ${i + 1}`} checked={selected.has(i)} onChange={() => setSelected((s) => { const n = new Set(s); if (n.has(i)) n.delete(i); else n.add(i); return n; })} /></td>
                {cols.map((c, ci) => <td key={c.name} className={cn("whitespace-nowrap px-3 py-1.5", c.type === "number" && "text-right", freeze && ci === 0 && "sticky left-8 bg-card font-medium")}>{cell(c, r[c.name])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-end gap-2 border-t p-2 text-xs">
        <span className="text-muted-foreground">Page {page + 1} of {pages}</span>
        <Button variant="outline" size="icon" className="size-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
        <Button variant="outline" size="icon" className="size-7" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
      </div>
    </section>
  );
}
