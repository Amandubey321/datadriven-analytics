import type { Column, Role } from "./types";

const RULES: [Role, RegExp, ColumnKind][] = [
  ["sensitive", /\b(pan|aadha?ar|gstin|gst_?no|phone|mobile|email|account_?(no|number)|ifsc|upi_?id|card)\b|pan_|_pan|aadhaar|gstin|mobile|email|phone|acc(ount)?_?no/i, "any"],
  ["target", /target|goal|quota|budget/i, "number"],
  ["profit", /profit|margin_amt|net_income|ebitda|earnings/i, "number"],
  ["revenue", /revenue|sales|turnover|net_amount|gross_amount|amount|billing|total_value|invoice_value|income|order_value|premium/i, "number"],
  ["cost", /cost|expense|spend|cogs|salary|payroll|ctc|purchase/i, "number"],
  ["stock", /stock|on_?hand|inventory|closing_qty/i, "number"],
  ["quantity", /qty|quantity|units|volume/i, "number"],
  ["price", /price|mrp|rate|unit_cost/i, "number"],
  ["date", /date|month|period|time|day|created|joined|admit/i, "date"],
  ["state", /state|province|\but\b/i, "category"],
  ["city", /city|town|district|location|branch/i, "category"],
  ["region", /region|zone|territory/i, "category"],
  ["pincode", /pin_?code|pin\b|postal|zip/i, "any"],
  ["product", /product|item|sku|model|service|plan/i, "category"],
  ["category", /category|segment|type|class|group|line/i, "category"],
  ["customer", /customer|client|buyer|patient|account_name|party/i, "category"],
  ["salesperson", /sales_?person|sales_?rep|agent|executive|manager|employee_name/i, "category"],
  ["department", /department|dept|division|team|ward|specialty|speciality/i, "category"],
  ["payment", /payment|mode|channel|method|upi/i, "category"],
  ["order", /order_?id|invoice|txn|transaction_?id|bill_?no|receipt/i, "any"],
];
type ColumnKind = "number" | "date" | "category" | "any";

export function detectRole(col: Pick<Column, "name" | "type">): Role | undefined {
  const n = col.name.replace(/[\s-]+/g, "_");
  for (const [role, re, kind] of RULES) {
    if (!re.test(n)) continue;
    if (kind === "any") return role;
    if (kind === "number" && col.type === "number") return role;
    if (kind === "date" && col.type === "date") return role;
    if (kind === "category" && (col.type === "category" || col.type === "text")) return role;
  }
  return undefined;
}

export function findRole(columns: Column[], role: Role): Column | undefined {
  return columns.find((c) => c.role === role);
}

export function isSensitive(c: Column) {
  return c.role === "sensitive";
}

export function maskValue(v: unknown): string {
  const s = String(v ?? "");
  if (s.length <= 4) return "••••";
  return `${"•".repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir","Ladakh","Puducherry","Chandigarh","Andaman and Nicobar Islands","Dadra and Nagar Haveli and Daman and Diu","Lakshadweep",
];
