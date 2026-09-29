import type { Cell, Column, ColType, Dataset, Row } from "./types";
import { detectRole } from "./semantics";

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

export function parseNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  let s = v.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/₹|rs\.?|inr|\/-/gi, "").replace(/,/g, "").replace(/\s/g, "");
  let mult = 1;
  const m = s.match(/^(-?[\d.]+)(cr|crore|crores|l|lakh|lakhs|lac|k)$/i);
  if (m) {
    s = m[1];
    const u = m[2].toLowerCase();
    mult = u.startsWith("c") ? 1e7 : u === "k" ? 1e3 : 1e5;
  }
  if (s.endsWith("%")) s = s.slice(0, -1);
  if (!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s)) return null;
  const n = Number(s) * mult;
  return Number.isFinite(n) ? (neg ? -n : n) : null;
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function iso(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** Parses Indian-style dd/mm/yyyy first, then ISO, dd-MMM-yyyy, MMM yyyy, Excel serials. */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    if (v > 20000 && v < 80000) { // Excel serial
      const d = new Date(Math.round((v - 25569) * 86400 * 1000));
      return d.toISOString().slice(0, 10);
    }
    return null;
  }
  if (typeof v !== "string") return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return iso(y, +m[2], +m[1]) ?? iso(y, +m[1], +m[2]); }
  m = s.match(/^(\d{1,2})[-\s]([a-z]{3,4})[a-z]*[-\s,]+(\d{2,4})$/i);
  if (m && MONTHS[m[2].toLowerCase()]) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return iso(y, MONTHS[m[2].toLowerCase()], +m[1]); }
  m = s.match(/^([a-z]{3,4})[a-z]*[-\s,]+(\d{4})$/i);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[2], MONTHS[m[1].toLowerCase()], 1);
  m = s.match(/^([a-z]{3,4})[a-z]*\s+(\d{1,2}),?\s+(\d{4})$/i);
  if (m && MONTHS[m[1].toLowerCase()]) return iso(+m[3], MONTHS[m[1].toLowerCase()], +m[2]);
  return null;
}

function isEmpty(v: unknown) {
  return v == null || (typeof v === "string" && (v.trim() === "" || /^(na|n\/a|null|none|nan|-)$/i.test(v.trim())));
}

function inferType(name: string, values: unknown[]): ColType {
  const vals = values.filter((v) => !isEmpty(v));
  if (vals.length === 0) return "text";
  const sample = vals.slice(0, 2000);
  const bools = sample.filter((v) => typeof v === "boolean" || /^(true|false|yes|no)$/i.test(String(v))).length;
  if (bools / sample.length > 0.95) return "boolean";
  const idLike = /(^|_|\s)(id|code|pin|pincode|zip|phone|mobile|gstin|pan|hsn|sac|invoice|no|number)$/i.test(name.trim());
  const nums = sample.filter((v) => parseNumber(v) != null).length;
  const dates = sample.filter((v) => (typeof v === "number" ? /date/i.test(name) && parseDate(v) : parseDate(v))).length;
  if (dates / sample.length >= 0.8 && (typeof sample[0] !== "number" || /date/i.test(name))) return "date";
  if (!idLike && nums / sample.length >= 0.85) return "number";
  const distinct = new Set(sample.map((v) => String(v).trim())).size;
  if (distinct <= Math.max(50, sample.length * 0.3) && !idLike) return "category";
  return idLike && distinct < sample.length * 0.5 ? "category" : "text";
}

export function buildDataset(name: string, source: string, raw: Record<string, unknown>[]): Dataset {
  if (!raw.length) throw new Error("The file has no data rows.");
  const keys = Array.from(new Set(raw.slice(0, 500).flatMap((r) => Object.keys(r))))
    .filter((k) => k && !/^__EMPTY/.test(k));
  if (!keys.length) throw new Error("No columns found. Make sure the first row contains column headers.");
  const clean = keys.map((k, i) => (k.trim() || `Column ${i + 1}`).replace(/\s+/g, " "));
  const columns: Column[] = keys.map((k, i) => {
    const type = inferType(clean[i], raw.map((r) => r[k]));
    const col: Column = { name: clean[i], type, invalid: 0 };
    col.role = detectRole(col);
    return col;
  });
  const rows: Row[] = raw.map((r) => {
    const out: Row = {};
    keys.forEach((k, i) => {
      const col = columns[i];
      const v = r[k];
      let c: Cell = null;
      if (!isEmpty(v)) {
        if (col.type === "number") { c = parseNumber(v); if (c == null) col.invalid++; }
        else if (col.type === "date") { c = parseDate(v); if (c == null) col.invalid++; }
        else if (col.type === "boolean") c = typeof v === "boolean" ? v : /^(true|yes)$/i.test(String(v));
        else c = v instanceof Date ? v.toISOString().slice(0, 10) : String(v).trim();
      }
      out[col.name] = c;
    });
    return out;
  });
  return { id: `ds_${Date.now().toString(36)}`, name, source, columns, rows, createdAt: Date.now() };
}

export const MAX_FILE_MB = 50;

export async function parseFile(file: File): Promise<Dataset> {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`File is larger than ${MAX_FILE_MB} MB. Split it into smaller files or filter it first.`);
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const base = file.name.replace(/\.[^.]+$/, "");
  try {
    if (["csv", "txt", "tsv", "psv", "dat", "tab"].includes(ext)) {
      const Papa = (await import("papaparse")).default;
      const text = await file.text();
      const res = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: "greedy", dynamicTyping: false, delimitersToGuess: [",", "\t", ";", "|", ":"] });
      if (!res.data.length) throw new Error("Couldn't read any rows from this file.");
      return buildDataset(base, file.name, res.data);
    }
    if (["xlsx", "xls", "xlsm", "xlsb", "ods", "fods", "numbers", "dbf", "html", "htm"].includes(ext)) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      // Pick the sheet with the most rows
      let best = wb.SheetNames[0], bestData: Record<string, unknown>[] = [];
      for (const n of wb.SheetNames) {
        const d = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[n], { defval: null, raw: true });
        if (d.length > bestData.length) { best = n; bestData = d; }
      }
      return buildDataset(base, `${file.name} · ${best}`, bestData);
    }
    if (ext === "jsonl" || ext === "ndjson") {
      const arr = (await file.text()).split(/\r?\n/).filter((l) => l.trim()).map((l) => JSON.parse(l));
      return buildDataset(base, file.name, arr.filter((r) => r && typeof r === "object"));
    }
    if (ext === "json") {
      const json = JSON.parse(await file.text());
      const arr = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Object.values(json).find(Array.isArray);
      if (!Array.isArray(arr)) throw new Error("JSON must be an array of records, or contain one.");
      return buildDataset(base, file.name, arr.filter((r) => r && typeof r === "object"));
    }
    if (ext === "xml") {
      const doc = new DOMParser().parseFromString(await file.text(), "application/xml");
      if (doc.querySelector("parsererror")) throw new Error("JSON parse: bad XML");
      const root = doc.documentElement;
      const recs = Array.from(root.children).length === 1 && root.children[0].children.length ? Array.from(root.children[0].children) : Array.from(root.children);
      const arr = recs.map((el) => {
        const o: Record<string, unknown> = {};
        for (const a of Array.from(el.attributes)) o[a.name] = a.value;
        for (const c of Array.from(el.children)) o[c.tagName] = c.textContent;
        return o;
      });
      return buildDataset(base, file.name, arr);
    }
  } catch (e) {
    if (e instanceof Error && !/Unexpected|JSON|zip|CFB/i.test(e.message)) throw e;
    throw new Error("This file looks damaged or isn't in the format its name says. Try re-exporting it.");
  }
  throw new Error("Unsupported file type. Use CSV, TSV, TXT, Excel (XLSX/XLS/XLSM/XLSB), ODS, Numbers, JSON, JSONL, XML or HTML.");
}
