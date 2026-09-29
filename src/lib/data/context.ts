import type { Dataset, Row } from "./types";
import type { AiMode } from "../store";
import { profileDataset } from "./quality";

/** Builds what the AI is allowed to see. Personal identifiers are never sent. */
export function buildAiContext(ds: Dataset, mode: AiMode) {
  const report = profileDataset({ ...ds, rows: ds.rows.slice(0, 20000) });
  const safeCols = ds.columns.filter((c) => c.role !== "sensitive");
  const columns = safeCols.map((c) => {
    const p = report.profiles.find((x) => x.name === c.name)!;
    const base: { name: string; type: string; role?: string; values?: string[]; min?: unknown; max?: unknown } = { name: c.name, type: c.type, role: c.role };
    if (c.type === "category" && p.distinct <= 60) {
      base.values = [...new Set(ds.rows.slice(0, 20000).map((r) => r[c.name]).filter((v) => v != null).map(String))].slice(0, 60);
    } else if (c.type === "category") base.values = p.top.map((t) => t.value);
    if (c.type === "date") { base.min = p.min; base.max = p.max; }
    if (c.type === "number" && mode === "samples") { base.min = p.min; base.max = p.max; }
    return base;
  });
  let samples: Row[] | undefined;
  if (mode === "samples") {
    samples = ds.rows.slice(0, 5).map((r) => Object.fromEntries(safeCols.map((c) => [c.name, r[c.name]])));
  }
  return { datasetName: ds.name, rowCount: ds.rows.length, columns, samples };
}
