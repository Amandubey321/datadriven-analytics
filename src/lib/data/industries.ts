export type Industry =
  | "retail" | "ecommerce" | "manufacturing" | "it" | "banking" | "healthcare" | "education"
  | "logistics" | "realestate" | "hospitality" | "fmcg" | "agriculture" | "automobile" | "consulting";

interface Labels { revenue: string; quantity: string; orders: string; aov: string; customers: string; cost: string }
const base: Labels = { revenue: "Total revenue", quantity: "Units sold", orders: "Total orders", aov: "Avg order value", customers: "Customers", cost: "Expenses" };

export const INDUSTRIES: Record<Industry, { name: string; labels: Labels; focus: string }> = {
  retail: { name: "Retail", labels: base, focus: "store & category performance" },
  ecommerce: { name: "E-commerce", labels: { ...base, revenue: "GMV", aov: "Avg basket value" }, focus: "GMV, AOV, payment mix, returns" },
  manufacturing: { name: "Manufacturing", labels: { ...base, quantity: "Units produced", orders: "Batches", aov: "Value per batch", cost: "Production cost" }, focus: "output, cost per unit, plant utilisation" },
  it: { name: "IT / Software", labels: { ...base, revenue: "Contract value", quantity: "Seats / licences", orders: "Deals", aov: "Avg deal size", customers: "Clients" }, focus: "bookings, deal size, client concentration" },
  banking: { name: "Banking / Finance", labels: { ...base, revenue: "Transaction value", quantity: "Volume", orders: "Transactions", aov: "Avg ticket size", customers: "Account holders" }, focus: "transaction value, channels, unusual activity" },
  healthcare: { name: "Healthcare", labels: { ...base, revenue: "Billing", quantity: "Patient days", orders: "Visits", aov: "Avg bill", customers: "Patients", cost: "Operating cost" }, focus: "billing, department load, length of stay" },
  education: { name: "Education", labels: { ...base, revenue: "Fee collection", orders: "Enrolments", aov: "Avg fee", customers: "Students" }, focus: "enrolments, fee collection" },
  logistics: { name: "Logistics", labels: { ...base, revenue: "Freight revenue", quantity: "Shipments", orders: "Consignments", aov: "Revenue per consignment" }, focus: "lanes, on-time delivery, cost per km" },
  realestate: { name: "Real Estate", labels: { ...base, revenue: "Booking value", quantity: "Units booked", orders: "Bookings", aov: "Avg ticket" }, focus: "bookings by project and city" },
  hospitality: { name: "Hospitality", labels: { ...base, revenue: "Room revenue", quantity: "Room nights", orders: "Bookings", aov: "ADR", customers: "Guests" }, focus: "occupancy, ADR, RevPAR" },
  fmcg: { name: "FMCG", labels: { ...base, orders: "Invoices", aov: "Avg invoice", customers: "Retailers / distributors" }, focus: "secondary sales, distribution, SKU mix" },
  agriculture: { name: "Agriculture", labels: { ...base, quantity: "Quantity (quintals)", orders: "Lots", customers: "Buyers / farmers" }, focus: "yield, mandi prices, seasonality" },
  automobile: { name: "Automobile", labels: { ...base, quantity: "Vehicles sold", orders: "Invoices", aov: "Avg realisation", customers: "Dealers / buyers" }, focus: "volume by model and dealer" },
  consulting: { name: "Consulting", labels: { ...base, revenue: "Billings", quantity: "Billable hours", orders: "Engagements", aov: "Avg engagement", customers: "Clients" }, focus: "utilisation, realisation, client mix" },
};
