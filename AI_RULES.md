# Bharat Analytics AI — Developer & AI Rules

This document outlines the core architecture, technology stack, library assignments, and operating rules for developing and maintaining the **Bharat Analytics AI** platform.

---

## Tech Stack Overview

- **Framework & Server Runtime**: TanStack Start with Vite and Nitro for full-stack React SSR and type-safe server functions (`createServerFn`).
- **Language & Types**: TypeScript (React 19) with strict type checking (recharts-compatible configuration).
- **Routing**: TanStack React Router using file-based routing under `src/routes/` (root layout in `src/routes/__root.tsx`).
- **State & Local Persistence**: Zustand paired with `idb-keyval` for client-side IndexedDB persistence of datasets and conversations.
- **Styling & Design System**: Tailwind CSS v4 (`@tailwindcss/vite`) with custom OKLCH design tokens (Indian saffron theme) and `tw-animate-css`.
- **UI Components & Icons**: Radix UI primitives with shadcn/ui patterns and `lucide-react` icons.
- **Data Parsing & File Handling**: `papaparse` for delimited files (CSV, TSV, TXT) and `xlsx` for spreadsheet workbooks (XLSX, XLS, ODS, etc.).
- **Data Visualizations**: `recharts` for responsive, interactive charting (Bar, Line, Area, Composed, Pie/Donut, Funnel, Scatter, Treemap).
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/openai`) executed server-side to generate query plans and explain computed results.
- **Validation, Notifications & Exports**: `zod` for input schema validation, `sonner` for toast notifications, and `html-to-image` for high-resolution PNG exports.

---

## Library & Tool Usage Rules

### 1. Data Processing vs. AI Responsibilities
- **AI Never Computes Numbers**: The LLM must **never** calculate totals, percentages, averages, or forecasts. 
- **Two-Phase Architecture**:
  1. `planQuestion` (Server function): Converts natural language into a deterministic `QuerySpec` (aggregations, filters, groupings).
  2. `runQuery` / `computeKPIs` / `forecast` (Client-side TS): Executes calculations strictly on the dataset in `src/lib/data/`.
  3. `explainData` (Server function): Generates natural language narratives **only** from pre-computed tables and metrics.
- **Data Privacy**: Sensitive fields (PAN, Aadhaar, GSTIN, phone numbers, account numbers) must be masked via `src/lib/data/semantics.ts` and never passed in raw form to external AI prompts.

### 2. File Ingestion & Parsing
- **CSV/Delimited Files**: Always use `papaparse` with dynamic delimiter detection and greedy empty line skipping.
- **Spreadsheets**: Always use `xlsx` (`read` and `sheet_to_json`), targeting the sheet with the most records.
- **JSON/JSONL/XML**: Standard browser APIs (`JSON.parse`, DOMParser) to flatten and coerce records.
- **Sanitization**: All ingestion routes must pass through `inferType` and `buildDataset` in `src/lib/data/parse.ts`.

### 3. Visualizations & Charting
- **Primary Chart Library**: Use `recharts` wrapped inside `ChartView` and `ChartCard`.
- **Chart Selection Guidelines**:
  - Time trends: `line` or `area`.
  - Categories & Rankings: `bar` or `hbar` (horizontal bar for long strings like Indian states/product names).
  - Part-to-whole (<= 7 categories): `donut` or `pie`.
  - Multi-metric / Dual-axis / Cumulative: `combo` or `pareto`.
  - Single summary metrics: `kpi` card.
  - Hierarchy & Distributions: `treemap`, `funnel`, or `histogram`.
- **Formatting**: Always format numerical and monetary figures using `src/lib/data/format.ts` (INR with Lakhs `₹12.5 L` and Crores `₹4.2 Cr`).

### 4. Routing & State Architecture
- **Route Definitions**: Define all routes in `src/routes/` as file routes. Do **not** use Next.js (`src/pages/`) or Remix conventions.
- **Global App Shell**: Managed in `src/routes/__root.tsx` and `src/components/AppShell.tsx`.
- **Persistent State**: Store datasets, active filters, selected industry, and chat histories in `src/lib/store.ts` using the IndexedDB storage adapter.
- **Transient UI State**: Use React local state (`useState`, `useReducer`) or URL search parameters where appropriate.

### 5. UI Components & Styling
- **Design Consistency**: Use shadcn/ui components in `src/components/ui/` styled with Tailwind utility classes.
- **Color Tokens**: Utilize theme variables defined in `src/styles.css` (`--saffron`, `--chart-1` through `--chart-6`, `--positive`, `--negative`).
- **Icons**: Exclusively use `lucide-react`. Do not import or introduce other icon libraries.
- **Feedback & Notifications**: Use `sonner` (`toast.success`, `toast.error`, `toast.info`) for all user notifications.

---

## Coding Best Practices

1. **Keep Components Focused**: Keep individual components small and modular (ideally under 150 lines). Extract sub-components into `src/components/`.
2. **Error Resilience**: Never crash on malformed rows or missing columns; provide fallback states, informative messages, and data quality flags.
3. **No Phantom Imports**: Ensure all imported packages exist in `package.json` and all local file paths resolve accurately.