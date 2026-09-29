export type ColType = "number" | "date" | "category" | "text" | "boolean";
export type Cell = string | number | boolean | null;
export type Row = Record<string, Cell>;

export type Role =
  | "revenue" | "profit" | "cost" | "quantity" | "price" | "date"
  | "state" | "city" | "region" | "pincode" | "product" | "category"
  | "customer" | "salesperson" | "department" | "payment" | "order"
  | "target" | "stock" | "sensitive";

export interface Column {
  name: string;
  type: ColType;
  role?: Role;
  invalid: number; // values that failed type coercion
}

export interface Dataset {
  id: string;
  name: string;
  source: string;
  columns: Column[];
  rows: Row[];
  createdAt: number;
}

export type Agg = "sum" | "avg" | "count" | "min" | "max" | "median" | "distinct";
export type Bucket = "day" | "week" | "month" | "quarter" | "year" | "monthOfYear";
export type ChartType =
  | "bar" | "hbar" | "stacked" | "grouped" | "line" | "area" | "pie" | "donut"
  | "scatter" | "histogram" | "combo" | "pareto" | "treemap" | "funnel" | "table" | "kpi";

export interface Filter {
  column: string;
  op: "eq" | "neq" | "in" | "gt" | "lt" | "gte" | "lte" | "between" | "contains";
  value: Cell | Cell[];
}

export interface Metric { column: string; agg: Agg }

export interface QuerySpec {
  groupBy?: string;
  bucket?: Bucket;
  series?: string;
  metrics: Metric[];
  filters?: Filter[];
  sort?: { by: string; dir: "asc" | "desc" };
  limit?: number;
  chart: ChartType;
}

export interface QueryResult {
  labelKey: string;
  valueKeys: string[];
  rows: Row[];
  rowsScanned: number;
}
