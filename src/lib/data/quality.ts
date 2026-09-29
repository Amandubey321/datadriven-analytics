import type { Column, Dataset, Row } from "./types";

export interface ColumnProfile {
  name: string;
  type: Column["type"];
  role?: Column["role"];
  missing: number;
  invalid: number;
  distinct: number;
  outliers: number;
  min?: number | string;
  max?: number | string;
  mean?: number;
  inconsistent: string[][]; // groups of variants like ["Mumbai","mumbai "]
  top: { value: string; count: number }[];
}

export interface QualityReport {
  rows: number;
  columns: number;
  duplicates: number;
  emptyColumns: string[];
  missingTotal: number;
  invalidTotal: number;
  outlierTotal: number;
  inconsistentTotal: number;
  score: number;
  profiles: ColumnProfile[];
}

export function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export function iqrBounds(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const iqr = q3 - q1;
  return { lo: q1 - 3 * iqr, hi: q3 + 3 * iqr, q1, q3 };
}

export function profileDataset(ds: Dataset): QualityReport {
  const { rows, columns } = ds;
  const profiles: ColumnProfile[] = columns.map((c) => {
    const vals = rows.map((r) => r[c.name]);
    const present = vals.filter((v) => v != null && v !== "");
    const missing = vals.length - present.length - c.invalid;
    const counts = new Map<string, number>();
    for (const v of present) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count }));
    const p: ColumnProfile = { name: c.name, type: c.type, role: c.role, missing: Math.max(0, missing), invalid: c.invalid, distinct: counts.size, outliers: 0, inconsistent: [], top };
    if (c.type === "number") {
      const nums = present as number[];
      if (nums.length) {
        let mn = Infinity, mx = -Infinity, sum = 0;
        for (const n of nums) { if (n < mn) mn = n; if (n > mx) mx = n; sum += n; }
        p.min = mn; p.max = mx; p.mean = sum / nums.length;
        if (nums.length >= 20) {
          const { lo, hi } = iqrBounds(nums);
          p.outliers = nums.filter((n) => n < lo || n > hi).length;
        }
      }
    } else if (c.type === "date") {
      const ds2 = (present as string[]).slice().sort();
      p.min = ds2[0]; p.max = ds2[ds2.length - 1];
    } else if (c.type === "category") {
      const groups = new Map<string, string[]>();
      for (const k of counts.keys()) {
        const norm = k.trim().toLowerCase().replace(/\s+/g, " ");
        groups.set(norm, [...(groups.get(norm) ?? []), k]);
      }
      p.inconsistent = [...groups.values()].filter((g) => g.length > 1);
    }
    return p;
  });

  const seen = new Set<string>();
  let duplicates = 0;
  for (const r of rows) {
    const k = JSON.stringify(r);
    if (seen.has(k)) duplicates++;
    else seen.add(k);
  }
  const emptyColumns = profiles.filter((p) => p.missing === rows.length).map((p) => p.name);
  const missingTotal = profiles.reduce((a, p) => a + p.missing, 0);
  const invalidTotal = profiles.reduce((a, p) => a + p.invalid, 0);
  const outlierTotal = profiles.reduce((a, p) => a + p.outliers, 0);
  const inconsistentTotal = profiles.reduce((a, p) => a + p.inconsistent.length, 0);
  const cells = Math.max(1, rows.length * columns.length);
  const score = Math.max(0, Math.round(
    100 - (missingTotal / cells) * 120 - (invalidTotal / cells) * 200 - (duplicates / Math.max(1, rows.length)) * 100
      - emptyColumns.length * 3 - Math.min(10, inconsistentTotal) - Math.min(5, (outlierTotal / Math.max(1, rows.length)) * 100),
  ));
  return { rows: rows.length, columns: columns.length, duplicates, emptyColumns, missingTotal, invalidTotal, outlierTotal, inconsistentTotal, score, profiles };
}

export interface CleanLog { label: string; count: number }

/** Safe automatic cleaning: never invents values. */
export function cleanDataset(ds: Dataset, report: QualityReport): { dataset: Dataset; log: CleanLog[] } {
  const log: CleanLog[] = [];
  const drop = new Set(report.emptyColumns);
  const columns = ds.columns.filter((c) => !drop.has(c.name)).map((c) => ({ ...c, invalid: 0 }));
  if (drop.size) log.push({ label: "Empty columns removed", count: drop.size });

  // canonical variant = most frequent spelling
  const canon = new Map<string, Map<string, string>>();
  let fixedCats = 0;
  for (const p of report.profiles) {
    if (!p.inconsistent.length) continue;
    const m = new Map<string, string>();
    const freq = new Map(p.top.map((t) => [t.value, t.count]));
    for (const g of p.inconsistent) {
      const best = [...g].sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || (a.trim() === a ? -1 : 1))[0].trim();
      for (const v of g) if (v !== best) { m.set(v, best); fixedCats++; }
    }
    canon.set(p.name, m);
  }
  if (fixedCats) log.push({ label: "Category spellings unified", count: fixedCats });

  const seen = new Set<string>();
  const rows: Row[] = [];
  let dups = 0, blank = 0;
  for (const r of ds.rows) {
    const out: Row = {};
    let any = false;
    for (const c of columns) {
      let v = r[c.name];
      if (typeof v === "string") { v = v.trim().replace(/\s+/g, " "); v = canon.get(c.name)?.get(r[c.name] as string) ?? v; }
      out[c.name] = v ?? null;
      if (v != null && v !== "") any = true;
    }
    if (!any) { blank++; continue; }
    const k = JSON.stringify(out);
    if (seen.has(k)) { dups++; continue; }
    seen.add(k);
    rows.push(out);
  }
  if (dups) log.push({ label: "Duplicate rows removed", count: dups });
  if (blank) log.push({ label: "Blank rows removed", count: blank });
  if (report.invalidTotal) log.push({ label: "Invalid dates/numbers set to blank (not guessed)", count: report.invalidTotal });
  return { dataset: { ...ds, columns, rows }, log };
}
