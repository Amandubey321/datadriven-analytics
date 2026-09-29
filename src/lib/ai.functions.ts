import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const colSchema = z.object({ name: z.string(), type: z.string(), role: z.string().optional(), values: z.array(z.string()).optional(), min: z.any().optional(), max: z.any().optional() });

const RULES = `You are the AI Analyst inside Bharat Analytics AI, a BI tool for Indian companies.
Hard rules:
- Never invent numbers. You do NOT compute results; you produce a query spec that the app executes on the real data.
- Only use column names that exist exactly as given.
- If the data can't answer the question, say so (action "insufficient") and explain what is missing.
- If the question is genuinely ambiguous, ask ONE short clarifying question (action "clarify").
- Never claim causation; for "why" questions, break the metric down by dimensions to show where the change happened.
- Never include PAN, Aadhaar, phone, email, account numbers or other personal identifiers.`;

const SPEC_DOC = `Return ONLY JSON:
{
 "action": "query" | "forecast" | "summary" | "clarify" | "insufficient" | "export",
 "title": "short chart title",
 "message": "for clarify/insufficient: what to tell the user; otherwise a one-line description of the method",
 "columnsUsed": ["..."],
 "spec": {                       // for action=query
   "groupBy": "column" (optional),
   "bucket": "day|week|month|quarter|year|monthOfYear" (only when groupBy is a date column),
   "series": "column" (optional second dimension; if it is a date column it splits by year — use with bucket monthOfYear for year-over-year),
   "metrics": [{"column": "numeric column (any column for count/distinct)", "agg": "sum|avg|count|min|max|median|distinct"}],
   "filters": [{"column": "...", "op": "eq|neq|in|gt|lt|gte|lte|between|contains", "value": ...}],  // dates as "YYYY-MM-DD"
   "sort": {"by": "groupBy column or metric name (metric name = column for sum, otherwise e.g. 'Average Revenue')", "dir": "asc|desc"},
   "limit": number,
   "chart": "bar|hbar|grouped|stacked|line|area|pie|donut|scatter|combo|pareto|treemap|funnel|table|kpi"
 },
 "forecast": {"dateColumn": "...", "valueColumn": "...", "horizon": "7d|30d|3m|6m|12m"}   // for action=forecast
}
Chart choice: time trend → line/area; ranking → bar or hbar (hbar for long labels such as states/products); share of total (≤7 slices) → donut; 2 metrics → combo or scatter; concentration → pareto; single number → kpi; year-over-year → line with series=date column and bucket=monthOfYear; month-over-month growth → groupBy date bucket month with chart combo.
"Unusual transactions" → action query, chart table, no groupBy is not allowed, so group by an ID-like column with sort desc and limit 20.
"Management summary" → action "summary". "Export"/"download report" → action "export".
Follow-ups ("now only show X", "compare with last year") modify the PREVIOUS spec.`;

export const planQuestion = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      question: z.string().min(1).max(1000),
      datasetName: z.string(),
      rowCount: z.number(),
      columns: z.array(colSchema).max(200),
      samples: z.array(z.record(z.string(), z.any())).max(8).optional(),
      history: z.array(z.object({ role: z.string(), text: z.string(), spec: z.any().optional() })).max(8),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<Result<string>> => {
    const { complete, extractJSON } = await import("./ai.server");
    const schema = data.columns.map((c) => `- "${c.name}" (${c.type}${c.role ? `, ${c.role}` : ""})${c.values?.length ? ` values: ${c.values.slice(0, 25).join(" | ")}` : ""}${c.min != null ? ` range: ${c.min} → ${c.max}` : ""}`).join("\n");
    const hist = data.history.map((h) => `${h.role}: ${h.text}${h.spec ? `\n  [spec: ${JSON.stringify(h.spec)}]` : ""}`).join("\n");
    const prompt = `Dataset "${data.datasetName}" with ${data.rowCount} rows. Currency INR.\nColumns:\n${schema}\n${data.samples?.length ? `Sample rows:\n${JSON.stringify(data.samples)}\n` : ""}${hist ? `\nConversation so far:\n${hist}\n` : ""}\nUser question: ${data.question}`;
    try {
      const text = await complete(`${RULES}\n\n${SPEC_DOC}`, prompt);
      return { ok: true, data: JSON.stringify(extractJSON(text)) };
    } catch (e) {
      return { ok: false, error: e instanceof Error && "status" in e ? e.message : "The AI response couldn't be understood. Try rephrasing your question." };
    }
  });

export const explainData = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      mode: z.enum(["answer", "chart", "summary"]),
      question: z.string().max(1000).optional(),
      title: z.string().max(300).optional(),
      method: z.string().max(3000).optional(),
      table: z.array(z.record(z.string(), z.any())).max(60),
      facts: z.array(z.string()).max(40).optional(),
    }).parse(d),
  )
  .handler(async ({ data }): Promise<Result<string>> => {
    const { complete } = await import("./ai.server");
    const sys = `${RULES}
You are given results ALREADY COMPUTED by the app from the real dataset. Use ONLY these numbers. Format money in Indian style (₹1,25,000 / ₹12.5 Lakh / ₹4.2 Crore). Use Markdown with short paragraphs and bullet points; bold key numbers. Keep it under 180 words unless asked for a summary.
${data.mode === "chart" ? "Explain the chart: what it shows, main trend, highest and lowest values, notable % changes, possible anomalies, and business implications. Don't claim causes." : ""}
${data.mode === "summary" ? "Write a management summary for founders: Headline, Performance, Risks, Recommended next steps (only those supported by the facts). Up to 300 words." : ""}
If the table is empty or insufficient, say what's missing.`;
    const prompt = `${data.question ? `Question: ${data.question}\n` : ""}${data.title ? `Chart: ${data.title}\n` : ""}${data.method ? `Method: ${data.method}\n` : ""}${data.facts?.length ? `Computed facts:\n- ${data.facts.join("\n- ")}\n` : ""}Result table (JSON):\n${JSON.stringify(data.table)}`;
    try {
      return { ok: true, data: await complete(sys, prompt) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "AI explanation failed." };
    }
  });
