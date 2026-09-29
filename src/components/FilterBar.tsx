import { useMemo } from "react";
import { FilterX } from "lucide-react";
import type { Dataset, Filter } from "@/lib/data/types";
import { useStore } from "@/lib/store";
import { getRoles } from "@/lib/data/analytics";

const DIMS = ["state", "city", "region", "product", "category", "customer", "salesperson", "department", "payment"] as const;

export function FilterBar({ ds }: { ds: Dataset }) {
  const { filters, setFilters } = useStore();
  const R = getRoles(ds);
  const dims = DIMS.map((d) => R[d]).filter((c, i, a): c is NonNullable<typeof c> => !!c && a.findIndex((x) => x?.name === c.name) === i);

  const options = useMemo(() => {
    const o: Record<string, string[]> = {};
    for (const c of dims) o[c.name] = [...new Set(ds.rows.map((r) => r[c.name]).filter((v) => v != null && v !== "").map(String))].sort().slice(0, 300);
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds]);

  const months = useMemo(() => {
    if (!R.date) return [];
    return [...new Set(ds.rows.map((r) => r[R.date!.name]).filter((v): v is string => typeof v === "string").map((d) => d.slice(0, 7)))].sort();
  }, [ds, R.date]);

  const get = (col: string, op: Filter["op"]) => filters.find((f) => f.column === col && f.op === op);
  const setF = (col: string, op: Filter["op"], value: Filter["value"] | null) => {
    const rest = filters.filter((f) => !(f.column === col && f.op === op));
    setFilters(value == null || value === "" ? rest : [...rest, { column: col, op, value }]);
  };

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 shadow-card">
      {R.date && months.length > 0 && (
        <>
          <label className="text-xs text-muted-foreground">From</label>
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={String(get(R.date.name, "gte")?.value ?? "").slice(0, 7)} onChange={(e) => setF(R.date!.name, "gte", e.target.value ? `${e.target.value}-01` : null)}>
            <option value="">Start</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label className="text-xs text-muted-foreground">To</label>
          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={String(get(R.date.name, "lte")?.value ?? "").slice(0, 7)} onChange={(e) => setF(R.date!.name, "lte", e.target.value ? `${e.target.value}-31` : null)}>
            <option value="">Latest</option>{months.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </>
      )}
      {dims.slice(0, 7).map((c) => (
        <select key={c.name} className="h-8 max-w-44 rounded-md border bg-background px-2 text-sm" value={String(get(c.name, "eq")?.value ?? "")} onChange={(e) => setF(c.name, "eq", e.target.value || null)} aria-label={c.name}>
          <option value="">All {c.name}</option>
          {options[c.name]?.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ))}
      {filters.length > 0 && (
        <button onClick={() => setFilters([])} className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"><FilterX className="size-3.5" />Clear {filters.length}</button>
      )}
    </div>
  );
}
