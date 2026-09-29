const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const num2 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** ₹1,25,000 */
export function formatINR(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n < 0 ? "-" : ""}₹${inr.format(Math.abs(n))}`;
}

/** ₹12.5 Lakh / ₹4.2 Crore / ₹8.4K */
export function formatINRCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e7) return `${s}₹${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${s}₹${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${s}₹${trim(a / 1e3)}K`;
  return `${s}₹${trim(a)}`;
}

export function formatCompact(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e7) return `${s}${trim(a / 1e7)} Cr`;
  if (a >= 1e5) return `${s}${trim(a / 1e5)} L`;
  if (a >= 1e3) return `${s}${trim(a / 1e3)}K`;
  return `${s}${trim(a)}`;
}

export function formatNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return num2.format(n);
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

function trim(v: number) {
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1).replace(/\.0$/, "") : v.toFixed(2).replace(/\.?0+$/, "");
}

/** Is this metric column monetary (for ₹ formatting)? */
export function isMoneyColumn(name: string): boolean {
  return /revenue|sales|amount|price|cost|expense|profit|salary|payroll|value|balance|gst|tax|mrp|rate|fee|billing|budget|target|income|spend|ctc|₹|inr|rs\b/i.test(name);
}

export function formatValue(key: string, v: unknown, compact = true): string {
  if (typeof v !== "number") return v == null ? "—" : String(v);
  if (/count|distinct|orders|qty|quantity|units|headcount|patients|beds/i.test(key) && !/amount/i.test(key)) return formatNum(v);
  if (isMoneyColumn(key)) return compact ? formatINRCompact(v) : formatINR(v);
  return compact ? formatCompact(v) : formatNum(v);
}
