import type { Dataset, Filter } from "./types";
import { applyFilters, bucketDate } from "./query";

export type Horizon = "7d" | "30d" | "3m" | "6m" | "12m";
export const HORIZONS: { id: Horizon; label: string; bucket: "day" | "month"; steps: number }[] = [
  { id: "7d", label: "7 days", bucket: "day", steps: 7 },
  { id: "30d", label: "30 days", bucket: "day", steps: 30 },
  { id: "3m", label: "3 months", bucket: "month", steps: 3 },
  { id: "6m", label: "6 months", bucket: "month", steps: 6 },
  { id: "12m", label: "12 months", bucket: "month", steps: 12 },
];

export interface ForecastPoint { period: string; actual?: number; forecast?: number; lower?: number; upper?: number }
export interface ForecastResult {
  points: ForecastPoint[];
  method: string;
  historyPeriods: number;
  error?: string;
  mape?: number;
}

function nextPeriod(p: string, bucket: "day" | "month"): string {
  if (bucket === "month") {
    const [y, m] = p.split("-").map(Number);
    const d = new Date(Date.UTC(y, m, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  const d = new Date(p + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Linear trend + seasonal index (when ≥2 cycles), with 95% band from residuals. */
export function forecast(ds: Dataset, dateCol: string, valueCol: string, horizon: Horizon, filters: Filter[] = []): ForecastResult {
  const h = HORIZONS.find((x) => x.id === horizon)!;
  const map = new Map<string, number>();
  for (const r of applyFilters(ds.rows, filters)) {
    const d = r[dateCol];
    const v = r[valueCol];
    if (typeof d !== "string" || typeof v !== "number") continue;
    const k = bucketDate(d, h.bucket);
    map.set(k, (map.get(k) ?? 0) + v);
  }
  let keys = [...map.keys()].sort();
  // fill gaps
  if (keys.length) {
    const filled: string[] = [keys[0]];
    while (filled[filled.length - 1] < keys[keys.length - 1] && filled.length < 5000) filled.push(nextPeriod(filled[filled.length - 1], h.bucket));
    keys = filled;
  }
  const y = keys.map((k) => map.get(k) ?? 0);
  const minHist = h.bucket === "month" ? 6 : 21;
  if (y.length < minHist) {
    return { points: keys.map((k, i) => ({ period: k, actual: y[i] })), method: "—", historyPeriods: y.length, error: `Not enough history: need at least ${minHist} ${h.bucket === "month" ? "months" : "days"} of data, found ${y.length}.` };
  }
  const season = h.bucket === "month" ? 12 : 7;
  const useSeason = y.length >= season * 2;
  const n = y.length;
  const xs = y.map((_, i) => i);
  const mx = (n - 1) / 2;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (y[i] - my); den += (x - mx) ** 2; });
  const slope = den ? num / den : 0;
  const intercept = my - slope * mx;
  const trend = (i: number) => intercept + slope * i;
  const seasonal = new Array(season).fill(1);
  if (useSeason) {
    const sums = new Array(season).fill(0), cnt = new Array(season).fill(0);
    y.forEach((v, i) => { const t = trend(i); if (t > 0) { sums[i % season] += v / t; cnt[i % season]++; } });
    for (let s = 0; s < season; s++) seasonal[s] = cnt[s] ? sums[s] / cnt[s] : 1;
  }
  const fit = (i: number) => Math.max(0, trend(i) * seasonal[i % season]);
  const resid = y.map((v, i) => v - fit(i));
  const sd = Math.sqrt(resid.reduce((a, b) => a + b * b, 0) / Math.max(1, n - 2));
  const mapeVals = y.map((v, i) => (v ? Math.abs(resid[i] / v) : 0)).filter((v) => v > 0);
  const mape = mapeVals.length ? (mapeVals.reduce((a, b) => a + b, 0) / mapeVals.length) * 100 : undefined;

  const points: ForecastPoint[] = keys.map((k, i) => ({ period: k, actual: y[i] }));
  points[points.length - 1].forecast = y[n - 1];
  points[points.length - 1].lower = y[n - 1];
  points[points.length - 1].upper = y[n - 1];
  let p = keys[n - 1];
  for (let s = 1; s <= h.steps; s++) {
    p = nextPeriod(p, h.bucket);
    const i = n - 1 + s;
    const f = fit(i);
    const band = 1.96 * sd * Math.sqrt(1 + s / n);
    points.push({ period: p, forecast: f, lower: Math.max(0, f - band), upper: f + band });
  }
  return { points, method: useSeason ? `Linear trend × ${season === 12 ? "monthly" : "weekday"} seasonality` : "Linear trend", historyPeriods: n, mape };
}
