import type { Column, Dataset, Filter, Row } from "./types";
import { findRole } from "./semantics";
import { applyFilters, bucketDate } from "./query";
import { formatINRCompact, formatNum, formatValue } from "./format";
import { iqrBounds } from "./quality";
import type { Industry } from "./industries";
import { INDUSTRIES } from "./industries";

export interface Roles {
  date?: Column; revenue?: Column; profit?: Column; cost?: Column; quantity?: Column; price?: Column;
  state?: Column; city?: Column; region?: Column; product?: Column; category?: Column; customer?: Column;
  salesperson?: Column; department?: Column; payment?: Column; order?: Column; target?: Column; stock?: Column;
}

export function getRoles(ds: Dataset): Roles {
  const r: Roles = {};
  for (const role of ["date","revenue","profit","cost","quantity","price","state","city","region","product","category","customer","salesperson","department","payment","order","target","stock"] as const) {
    r[role] = findRole(ds.columns, role);
  }
  if (!r.revenue) r.revenue = ds.columns.find((c) => c.type === "number" && c.role !== "sensitive" && c.role !== "pincode");
  if (!r.date) r.date = ds.columns.find((c) => c.type === "date");
  return r;
}

export interface KPI { id: string; label: string; value: number | null; previous: number | null; change: number | null; format: "money" | "number" | "pct"; hint?: string }

const sum = (rows: Row[], col?: Column) => (col ? rows.reduce((a, r) => a + (typeof r[col.name] === "number" ? (r[col.name] as number) : 0), 0) : null);
const distinct = (rows: Row[], col?: Column) => (col ? new Set(rows.map((r) => r[col.name]).filter((v) => v != null)).size : null);

export function periodSplit(rows: Row[], dateCol?: Column) {
  if (!dateCol) return { current: rows, previous: [] as Row[], currentLabel: "All data", previousLabel: "" };
  const months = [...new Set(rows.map((r) => r[dateCol.name]).filter((v): v is string => typeof v === "string").map((d) => d.slice(0, 7)))].sort();
  if (months.length < 2) return { current: rows, previous: [], currentLabel: months[0] ?? "All data", previousLabel: "" };
  const cur = months[months.length - 1], prev = months[months.length - 2];
  return {
    current: rows.filter((r) => String(r[dateCol.name] ?? "").startsWith(cur)),
    previous: rows.filter((r) => String(r[dateCol.name] ?? "").startsWith(prev)),
    currentLabel: monthLabel(cur), previousLabel: monthLabel(prev),
  };
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  if (!m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function computeKPIs(ds: Dataset, rows: Row[], industry: Industry): { kpis: KPI[]; currentLabel: string; previousLabel: string } {
  const R = getRoles(ds);
  const { current, previous, currentLabel, previousLabel } = periodSplit(rows, R.date);
  const labels = INDUSTRIES[industry].labels;
  const mk = (id: string, label: string, f: (rs: Row[]) => number | null, format: KPI["format"], hint?: string): KPI | null => {
    const all = f(rows);
    if (all == null) return null;
    const c = previous.length ? f(current) : all;
    const p = previous.length ? f(previous) : null;
    return { id, label, value: c, previous: p, change: p && c != null ? ((c - p) / Math.abs(p)) * 100 : null, format, hint };
  };
  const orders = (rs: Row[]) => (R.order ? distinct(rs, R.order) : rs.length);
  const firstSeen = new Map<string, string>();
  if (R.customer && R.date) for (const r of rows) {
    const c = String(r[R.customer.name]); const d = String(r[R.date.name] ?? "");
    if (!firstSeen.has(c) || d < firstSeen.get(c)!) firstSeen.set(c, d);
  }
  const isCostOnly = R.revenue && R.cost && R.revenue.name === R.cost.name;
  const list = [
    R.revenue && !isCostOnly ? mk("revenue", labels.revenue, (rs) => sum(rs, R.revenue), "money") : null,
    R.quantity ? mk("sales", labels.quantity, (rs) => sum(rs, R.quantity), "number") : null,
    R.profit ? mk("profit", "Gross profit", (rs) => sum(rs, R.profit), "money") : null,
    R.profit && R.cost && R.cost.name !== R.revenue?.name ? mk("net", "Net profit", (rs) => (sum(rs, R.profit) ?? 0) - (sum(rs, R.cost) ?? 0), "money", `Gross profit − ${R.cost.name}`) : null,
    R.profit && R.revenue ? mk("margin", "Profit margin", (rs) => { const s = sum(rs, R.revenue) ?? 0; return s ? ((sum(rs, R.profit) ?? 0) / s) * 100 : null; }, "pct") : null,
    mk("orders", labels.orders, orders, "number", R.order ? `Distinct ${R.order.name}` : "Row count"),
    R.revenue ? mk("aov", labels.aov, (rs) => { const o = orders(rs); return o ? (sum(rs, R.revenue) ?? 0) / o : null; }, "money") : null,
    R.customer ? mk("customers", labels.customers, (rs) => distinct(rs, R.customer), "number") : null,
    R.customer && R.date && previous.length ? mk("new", "New " + labels.customers.toLowerCase(), (rs) => {
      const ym = rs[0] ? String(rs[0][R.date!.name] ?? "").slice(0, 7) : "";
      return new Set(rs.filter((r) => (firstSeen.get(String(r[R.customer!.name])) ?? "").startsWith(ym)).map((r) => r[R.customer!.name])).size;
    }, "number", "First purchase in the period") : null,
    R.customer && R.date && previous.length ? mk("returning", "Returning " + labels.customers.toLowerCase(), (rs) => {
      const ym = rs[0] ? String(rs[0][R.date!.name] ?? "").slice(0, 7) : "";
      return new Set(rs.filter((r) => (firstSeen.get(String(r[R.customer!.name])) ?? "") < ym).map((r) => r[R.customer!.name])).size;
    }, "number") : null,
    R.cost ? mk("expenses", labels.cost, (rs) => sum(rs, R.cost), "money") : null,
    R.stock && R.price ? mk("inventory", "Inventory value", (rs) => rs.reduce((a, r) => a + ((r[R.stock!.name] as number) || 0) * ((r[R.price!.name] as number) || 0), 0), "money", `${R.stock.name} × ${R.price.name}`) : null,
    R.target && R.revenue ? mk("achievement", "Target achievement", (rs) => { const t = sum(rs, R.target) ?? 0; return t ? ((sum(rs, R.revenue) ?? 0) / t) * 100 : null; }, "pct", `${R.revenue.name} ÷ ${R.target.name}`) : null,
  ].filter((k): k is KPI => !!k);
  return { kpis: list, currentLabel, previousLabel };
}

export function formatKPI(k: KPI, v = k.value) {
  if (v == null) return "—";
  return k.format === "money" ? formatINRCompact(v) : k.format === "pct" ? `${v.toFixed(1)}%` : formatNum(Math.round(v));
}

export type InsightKind = "positive" | "negative" | "anomaly" | "opportunity" | "risk" | "recommendation";
export interface Insight { kind: InsightKind; text: string; basis: string }

function groupSum(rows: Row[], key: string, val: string) {
  const m = new Map<string, number>();
  for (const r of rows) { const k = r[key]; const v = r[val]; if (k == null || typeof v !== "number") continue; m.set(String(k), (m.get(String(k)) ?? 0) + v); }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** Deterministic, data-backed insights. Every number comes from a computation. */
export function generateInsights(ds: Dataset, rows: Row[]): Insight[] {
  const R = getRoles(ds);
  const out: Insight[] = [];
  const val = R.revenue;
  if (!val) return [{ kind: "risk", text: "No numeric measure (like revenue or amount) was found, so trend insights can't be computed.", basis: "Column types" }];
  const V = val.name;
  const fmt = (n: number) => formatValue(V, n);
  const total = rows.reduce((a, r) => a + ((r[V] as number) || 0), 0);

  if (R.date) {
    const months = groupSum(rows.map((r) => ({ ...r, __m: typeof r[R.date!.name] === "string" ? bucketDate(r[R.date!.name] as string, "month") : null })), "__m", V).sort((a, b) => a[0].localeCompare(b[0]));
    if (months.length >= 2) {
      const [pm, pv] = months[months.length - 2], [cm, cv] = months[months.length - 1];
      const ch = pv ? ((cv - pv) / pv) * 100 : 0;
      let driver = "";
      const dim = R.region ?? R.state ?? R.product;
      if (dim && Math.abs(ch) > 1) {
        const a = new Map(groupSum(rows.filter((r) => String(r[R.date!.name]).startsWith(pm)), dim.name, V));
        const b = groupSum(rows.filter((r) => String(r[R.date!.name]).startsWith(cm)), dim.name, V);
        const deltas = b.map(([k, v]) => [k, v - (a.get(k) ?? 0)] as const).sort((x, y) => (ch < 0 ? x[1] - y[1] : y[1] - x[1]));
        if (deltas[0]) driver = `, the largest change coming from ${deltas[0][0]} (${deltas[0][1] > 0 ? "+" : ""}${fmt(deltas[0][1])})`;
      }
      out.push({ kind: ch >= 0 ? "positive" : "negative", text: `${V} ${ch >= 0 ? "rose" : "fell"} ${Math.abs(ch).toFixed(1)}% in ${monthLabel(cm)} vs ${monthLabel(pm)} (${fmt(cv)} vs ${fmt(pv)})${driver}.`, basis: `SUM(${V}) by month of ${R.date.name}` });
    }
    const q = groupSum(rows.map((r) => ({ ...r, __q: typeof r[R.date!.name] === "string" ? bucketDate(r[R.date!.name] as string, "quarter") : null })), "__q", V).sort((a, b) => a[0].localeCompare(b[0]));
    if (q.length >= 2) {
      const [pq, pv] = q[q.length - 2], [cq, cv] = q[q.length - 1];
      const ch = pv ? ((cv - pv) / pv) * 100 : 0;
      out.push({ kind: ch >= 0 ? "positive" : "negative", text: `${V} ${ch >= 0 ? "increased" : "decreased"} by ${Math.abs(ch).toFixed(1)}% in ${cq} compared with ${pq}.`, basis: `SUM(${V}) by quarter` });
    }
    if (months.length >= 6) {
      const vals = months.map((m) => m[1]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
      for (const [m, v] of months) if (sd && Math.abs(v - mean) > 2 * sd) out.push({ kind: "anomaly", text: `${monthLabel(m)} ${V} (${fmt(v)}) is unusually ${v > mean ? "high" : "low"} — more than 2 standard deviations from the monthly average of ${fmt(mean)}.`, basis: "Monthly totals, z-score > 2" });
    }
  }
  const geo = R.state ?? R.region ?? R.city;
  if (geo) {
    const g = groupSum(rows, geo.name, V);
    if (g[0]) out.push({ kind: "positive", text: `${g[0][0]} generated the highest ${V} at ${fmt(g[0][1])} (${((g[0][1] / total) * 100).toFixed(1)}% of total).`, basis: `SUM(${V}) by ${geo.name}` });
    if (g.length > 3) { const last = g[g.length - 1]; out.push({ kind: "opportunity", text: `${last[0]} contributes only ${((last[1] / total) * 100).toFixed(1)}% of ${V} (${fmt(last[1])}) — the smallest ${geo.name.toLowerCase()} in the data.`, basis: `SUM(${V}) by ${geo.name}` }); }
  }
  const prod = R.product ?? R.category;
  if (prod) {
    const g = groupSum(rows, prod.name, V);
    if (g[0]) out.push({ kind: "positive", text: `${g[0][0]} contributed ${((g[0][1] / total) * 100).toFixed(1)}% of total ${V}.`, basis: `SUM(${V}) by ${prod.name}` });
    let cum = 0, n80 = 0;
    for (const [, v] of g) { cum += v; n80++; if (cum >= total * 0.8) break; }
    if (g.length >= 5) out.push({ kind: n80 / g.length < 0.3 ? "risk" : "opportunity", text: `${n80} of ${g.length} ${prod.name.toLowerCase()} values make up 80% of ${V}${n80 / g.length < 0.3 ? " — revenue is concentrated" : ""}.`, basis: "Pareto (cumulative share)" });
    if (R.profit) {
      const p = groupSum(rows, prod.name, R.profit.name);
      const losing = p.filter(([, v]) => v < 0);
      if (losing.length) out.push({ kind: "risk", text: `${losing.length} ${prod.name.toLowerCase()} value${losing.length > 1 ? "s have" : " has"} negative total ${R.profit.name}: ${losing.slice(0, 4).map(([k, v]) => `${k} (${formatINRCompact(v)})`).join(", ")}.`, basis: `SUM(${R.profit.name}) by ${prod.name} < 0` });
      if (losing.length) out.push({ kind: "recommendation", text: `Review pricing, discounts or costs for ${losing[0][0]}, the largest loss-maker in this data.`, basis: "Based on negative profit totals" });
    }
  }
  if (R.customer) {
    const g = groupSum(rows, R.customer.name, V);
    const top10 = g.slice(0, 10).reduce((a, [, v]) => a + v, 0);
    if (g.length > 20) out.push({ kind: top10 / total > 0.5 ? "risk" : "positive", text: `Top 10 ${R.customer.name.toLowerCase()} values account for ${((top10 / total) * 100).toFixed(1)}% of ${V}.`, basis: `SUM(${V}) by ${R.customer.name}` });
  }
  const nums = rows.map((r) => r[V]).filter((v): v is number => typeof v === "number");
  if (nums.length >= 30) {
    const { hi, lo } = iqrBounds(nums);
    const n = nums.filter((v) => v > hi || v < lo).length;
    if (n) out.push({ kind: "anomaly", text: `${n} record${n > 1 ? "s have" : " has"} an unusual ${V} (outside ${fmt(Math.max(lo, 0))}–${fmt(hi)}).`, basis: "IQR method (3× IQR)" });
  }
  if (R.profit && R.revenue) {
    const p = rows.reduce((a, r) => a + ((r[R.profit!.name] as number) || 0), 0);
    const m = total ? (p / total) * 100 : 0;
    out.push({ kind: m >= 15 ? "positive" : m >= 0 ? "opportunity" : "negative", text: `Overall profit margin is ${m.toFixed(1)}% (${formatINRCompact(p)} profit on ${formatINRCompact(total)}).`, basis: `SUM(${R.profit.name}) ÷ SUM(${V})` });
  }
  if (geo && out.some((i) => i.kind === "opportunity")) out.push({ kind: "recommendation", text: `Compare the smallest and largest ${geo.name.toLowerCase()} values in the AI Analyst to see which products drive the gap.`, basis: "Follow-up suggestion" });
  return out;
}

export interface Anomaly { row: Row; column: string; value: number; reason: string }
export function detectAnomalies(ds: Dataset, rows: Row[], limit = 20): Anomaly[] {
  const R = getRoles(ds);
  const cols = [R.revenue, R.profit, R.quantity].filter((c): c is Column => !!c);
  const out: Anomaly[] = [];
  for (const c of cols) {
    const nums = rows.map((r) => r[c.name]).filter((v): v is number => typeof v === "number");
    if (nums.length < 30) continue;
    const { lo, hi } = iqrBounds(nums);
    for (const r of rows) {
      const v = r[c.name];
      if (typeof v === "number" && (v > hi || v < lo)) out.push({ row: r, column: c.name, value: v, reason: v > hi ? `Above ${formatValue(c.name, hi)}` : `Below ${formatValue(c.name, lo)}` });
    }
  }
  return out.sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, limit);
}

export function filterRows(ds: Dataset, filters: Filter[]) { return applyFilters(ds.rows, filters); }
