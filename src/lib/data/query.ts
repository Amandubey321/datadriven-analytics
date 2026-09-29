import type { Agg, Bucket, Cell, Dataset, Filter, QueryResult, QuerySpec, Row } from "./types";

export function bucketDate(iso: string, b: Bucket): string {
  const [y, m, d] = iso.split("-").map(Number);
  switch (b) {
    case "day": return iso;
    case "week": {
      const dt = new Date(Date.UTC(y, m - 1, d));
      const day = (dt.getUTCDay() + 6) % 7;
      dt.setUTCDate(dt.getUTCDate() - day);
      return dt.toISOString().slice(0, 10);
    }
    case "month": return `${y}-${String(m).padStart(2, "0")}`;
    case "quarter": return `${y}-Q${Math.ceil(m / 3)}`;
    case "year": return String(y);
    case "monthOfYear": return `${String(m).padStart(2, "0")} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][m - 1]}`;
  }
}

export function matchFilter(r: Row, f: Filter): boolean {
  const v = r[f.column];
  const val = f.value;
  const eq = (a: Cell, b: Cell) => a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase();
  switch (f.op) {
    case "eq": return eq(v, val as Cell);
    case "neq": return !eq(v, val as Cell);
    case "in": return Array.isArray(val) && val.some((x) => eq(v, x));
    case "contains": return v != null && String(v).toLowerCase().includes(String(val).toLowerCase());
    case "gt": return v != null && v > (val as number | string);
    case "lt": return v != null && v < (val as number | string);
    case "gte": return v != null && v >= (val as number | string);
    case "lte": return v != null && v <= (val as number | string);
    case "between": return Array.isArray(val) && v != null && v >= (val[0] as number | string) && v <= (val[1] as number | string);
  }
}

export function applyFilters(rows: Row[], filters: Filter[] = []): Row[] {
  if (!filters.length) return rows;
  return rows.filter((r) => filters.every((f) => matchFilter(r, f)));
}

export function aggregate(values: Cell[], agg: Agg): number | null {
  if (agg === "count") return values.filter((v) => v != null && v !== "").length;
  if (agg === "distinct") return new Set(values.filter((v) => v != null && v !== "").map(String)).size;
  const nums = values.filter((v): v is number => typeof v === "number");
  if (!nums.length) return null;
  switch (agg) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    case "median": {
      const s = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
  }
  return null;
}

export const AGG_LABEL: Record<Agg, string> = { sum: "Total", avg: "Average", count: "Count", min: "Min", max: "Max", median: "Median", distinct: "Distinct" };
export function metricKey(m: { column: string; agg: Agg }) {
  return m.agg === "sum" ? m.column : `${AGG_LABEL[m.agg]} ${m.column}`;
}

/** Executes a validated spec against the dataset. Pure, deterministic. */
export function runQuery(ds: Dataset, spec: QuerySpec): QueryResult {
  const names = new Set(ds.columns.map((c) => c.name));
  for (const c of [spec.groupBy, spec.series, ...spec.metrics.map((m) => m.column), ...(spec.filters ?? []).map((f) => f.column)]) {
    if (c && !names.has(c)) throw new Error(`Column "${c}" doesn't exist in this dataset.`);
  }
  const rows = applyFilters(ds.rows, spec.filters);
  const gcol = spec.groupBy ? ds.columns.find((c) => c.name === spec.groupBy) : undefined;
  const keyOf = (r: Row): string | null => {
    if (!spec.groupBy) return "All";
    const v = r[spec.groupBy];
    if (v == null || v === "") return null;
    if (gcol?.type === "date" && typeof v === "string") return bucketDate(v, spec.bucket ?? "month");
    return String(v);
  };
  const labelKey = spec.groupBy ?? "Group";
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const k = keyOf(r);
    if (k == null) continue;
    let g = groups.get(k);
    if (!g) groups.set(k, (g = []));
    g.push(r);
  }

  const scol = spec.series ? ds.columns.find((c) => c.name === spec.series) : undefined;
  const seriesOf = (r: Row): string | null => {
    const v = r[spec.series!];
    if (v == null || v === "") return null;
    return scol?.type === "date" ? String(v).slice(0, 4) : String(v);
  };
  let valueKeys: string[] = [];
  let out: Row[] = [];
  if (spec.series && spec.metrics[0]) {
    const m = spec.metrics[0];
    const seriesVals = new Map<string, number>();
    for (const r of rows) {
      const s = seriesOf(r);
      if (s == null) continue;
      seriesVals.set(s, (seriesVals.get(s) ?? 0) + (typeof r[m.column] === "number" ? (r[m.column] as number) : 1));
    }
    valueKeys = [...seriesVals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k]) => k);
    if (scol?.type === "date") valueKeys.sort();
    for (const [k, g] of groups) {
      const row: Row = { [labelKey]: k };
      for (const s of valueKeys) row[s] = aggregate(g.filter((r) => seriesOf(r) === s).map((r) => r[m.column]), m.agg) ?? 0;
      out.push(row);
    }
  } else {
    valueKeys = spec.metrics.map(metricKey);
    for (const [k, g] of groups) {
      const row: Row = { [labelKey]: k };
      spec.metrics.forEach((m, i) => { row[valueKeys[i]] = aggregate(g.map((r) => r[m.column]), m.agg); });
      out.push(row);
    }
  }

  const isTime = gcol?.type === "date";
  if (spec.sort) {
    const by = spec.sort.by === labelKey || valueKeys.includes(spec.sort.by) ? spec.sort.by : valueKeys[0];
    const dir = spec.sort.dir === "asc" ? 1 : -1;
    out.sort((a, b) => ((a[by] as number) > (b[by] as number) ? dir : (a[by] as number) < (b[by] as number) ? -dir : 0));
  } else if (isTime) {
    out.sort((a, b) => String(a[labelKey]).localeCompare(String(b[labelKey])));
  } else if (valueKeys[0] && !spec.series) {
    out.sort((a, b) => ((b[valueKeys[0]] as number) ?? 0) - ((a[valueKeys[0]] as number) ?? 0));
  }
  if (spec.limit && spec.limit > 0) out = out.slice(0, spec.limit);
  return { labelKey, valueKeys, rows: out, rowsScanned: rows.length };
}

/** Human-readable SQL rendering of a spec, for the "Inspect" panel. */
export function specToSQL(spec: QuerySpec, table = "dataset"): string {
  const q = (s: string) => `"${s}"`;
  const g = spec.groupBy ? (spec.bucket ? `DATE_TRUNC('${spec.bucket}', ${q(spec.groupBy)})` : q(spec.groupBy)) : null;
  const sel = [
    g ? `${g} AS ${q(spec.groupBy!)}` : null,
    spec.series ? q(spec.series) : null,
    ...spec.metrics.map((m) => `${m.agg === "distinct" ? `COUNT(DISTINCT ${q(m.column)})` : m.agg === "median" ? `MEDIAN(${q(m.column)})` : `${m.agg.toUpperCase()}(${q(m.column)})`} AS ${q(metricKey(m))}`),
  ].filter(Boolean);
  const where = (spec.filters ?? []).map((f) => {
    const lit = (v: unknown) => (typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
    const ops: Record<string, string> = { eq: "=", neq: "<>", gt: ">", lt: "<", gte: ">=", lte: "<=" };
    if (f.op === "in") return `${q(f.column)} IN (${(f.value as unknown[]).map(lit).join(", ")})`;
    if (f.op === "between") return `${q(f.column)} BETWEEN ${lit((f.value as unknown[])[0])} AND ${lit((f.value as unknown[])[1])}`;
    if (f.op === "contains") return `${q(f.column)} ILIKE '%${String(f.value)}%'`;
    return `${q(f.column)} ${ops[f.op]} ${lit(f.value)}`;
  });
  const lines = [`SELECT ${sel.join(",\n       ")}`, `FROM ${table}`];
  if (where.length) lines.push(`WHERE ${where.join("\n  AND ")}`);
  if (g) lines.push(`GROUP BY ${[g, spec.series ? q(spec.series) : null].filter(Boolean).join(", ")}`);
  if (spec.sort) lines.push(`ORDER BY ${q(spec.sort.by)} ${spec.sort.dir.toUpperCase()}`);
  if (spec.limit) lines.push(`LIMIT ${spec.limit}`);
  return lines.join("\n") + ";";
}

export function toCSV(rows: Row[], cols?: string[]): string {
  const keys = cols ?? Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.map(esc).join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
