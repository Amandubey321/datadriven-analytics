import type { Dataset } from "./types";
import { buildDataset } from "./parse";
import type { Industry } from "./industries";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const GEO: [string, string, string[]][] = [
  ["Maharashtra", "West", ["Mumbai", "Pune", "Nagpur", "Nashik"]],
  ["Madhya Pradesh", "Central", ["Indore", "Bhopal", "Jabalpur"]],
  ["Rajasthan", "North", ["Jaipur", "Udaipur", "Jodhpur"]],
  ["Gujarat", "West", ["Ahmedabad", "Surat", "Vadodara"]],
  ["Karnataka", "South", ["Bengaluru", "Mysuru", "Hubballi"]],
  ["Tamil Nadu", "South", ["Chennai", "Coimbatore", "Madurai"]],
  ["Delhi", "North", ["New Delhi"]],
  ["Uttar Pradesh", "North", ["Lucknow", "Noida", "Kanpur", "Varanasi"]],
  ["West Bengal", "East", ["Kolkata", "Siliguri"]],
  ["Telangana", "South", ["Hyderabad", "Warangal"]],
  ["Kerala", "South", ["Kochi", "Thiruvananthapuram"]],
  ["Punjab", "North", ["Ludhiana", "Amritsar"]],
];
const GEO_W = [18, 8, 7, 10, 12, 9, 9, 8, 6, 7, 3, 3];
const FIRST = ["Aarav","Vivaan","Aditya","Ananya","Diya","Ishaan","Kavya","Rohan","Priya","Arjun","Sneha","Rahul","Pooja","Karan","Meera","Siddharth","Neha","Vikram","Aisha","Manish"];
const LAST = ["Sharma","Patel","Iyer","Reddy","Gupta","Nair","Singh","Joshi","Mehta","Das","Kulkarni","Agarwal","Menon","Chauhan","Bose"];

function pickW<T>(r: () => number, items: T[], w: number[]) {
  const t = w.reduce((a, b) => a + b, 0);
  let x = r() * t;
  for (let i = 0; i < items.length; i++) { x -= w[i]; if (x <= 0) return items[i]; }
  return items[items.length - 1];
}
const pick = <T,>(r: () => number, a: T[]) => a[Math.floor(r() * a.length)];
const dateStr = (d: Date) => d.toISOString().slice(0, 10);
const ddmmyyyy = (d: Date) => `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
function dateIn(r: () => number, months = 24, seasonal = true) {
  const start = Date.UTC(2024, 3, 1);
  for (;;) {
    const t = start + r() * months * 30.4 * 86400000;
    const d = new Date(t);
    const m = d.getUTCMonth();
    const boost = !seasonal ? 1 : [9, 10].includes(m) ? 1.45 : m === 2 ? 1.2 : [6, 7].includes(m) ? 0.8 : 1;
    const growth = 1 + (t - start) / (months * 30.4 * 86400000) * 0.35;
    if (r() < (boost * growth) / 2) return d;
  }
}
const person = (r: () => number) => `${pick(r, FIRST)} ${pick(r, LAST)}`;
const pan = (r: () => number) => `${"ABCDEFGHJK"[Math.floor(r() * 10)]}${"LMNPQRSTUV"[Math.floor(r() * 10)]}XPC${1000 + Math.floor(r() * 8999)}K`;

export interface DemoMeta { id: string; name: string; industry: Industry; description: string }
export const DEMOS: DemoMeta[] = [
  { id: "retail", name: "Retail sales — Apr 2024 to Mar 2026", industry: "retail", description: "Store sales across 12 states with products, customers and profit" },
  { id: "ecommerce", name: "E-commerce orders", industry: "ecommerce", description: "Online orders with UPI/COD payment mix and returns" },
  { id: "hr", name: "Employee HR & payroll", industry: "it", description: "Headcount, departments, CTC and attendance" },
  { id: "bank", name: "Bank transactions", industry: "banking", description: "Branch transactions by channel with unusual activity" },
  { id: "hospital", name: "Hospital operations", industry: "healthcare", description: "Admissions, departments, billing and length of stay" },
  { id: "it", name: "IT company sales", industry: "it", description: "Deals by client, service line and sales rep, with targets" },
  { id: "manufacturing", name: "Manufacturing output", industry: "manufacturing", description: "Plant production, cost and rejection rates" },
  { id: "inventory", name: "Inventory", industry: "fmcg", description: "Warehouse stock, reorder levels and value" },
];

type Raw = Record<string, unknown>[];

function retail(r: () => number): Raw {
  const products: [string, string, number, number][] = [
    ["Basmati Rice 5kg", "Grocery", 720, 0.14], ["Toor Dal 1kg", "Grocery", 165, 0.12], ["Sunflower Oil 1L", "Grocery", 155, 0.08],
    ["Masala Chai 500g", "Beverages", 260, 0.22], ["Filter Coffee 250g", "Beverages", 310, 0.25], ["Cotton Kurta", "Apparel", 1299, 0.38],
    ["Silk Saree", "Apparel", 5499, 0.32], ["Pressure Cooker 5L", "Home & Kitchen", 2199, 0.18], ["Steel Tiffin", "Home & Kitchen", 649, 0.2],
    ["LED Bulb 9W", "Electricals", 99, -0.06], ["Ceiling Fan", "Electricals", 2890, 0.11], ["Smartphone Cover", "Accessories", 299, -0.04],
  ];
  const custs = Array.from({ length: 420 }, (_, i) => `CUST${String(1001 + i)}`);
  const reps = Array.from({ length: 14 }, () => person(r));
  const out: Raw = [];
  for (let i = 0; i < 4200; i++) {
    const [state, region, cities] = pickW(r, GEO, GEO_W);
    const [p, cat, price, margin] = pick(r, products);
    const d = dateIn(r);
    // August dip in the West for the "why did revenue fall" story
    if (d.getUTCMonth() === 7 && region === "West" && r() < 0.35) continue;
    const qty = 1 + Math.floor(r() * (price > 2000 ? 3 : 12));
    const disc = r() < 0.3 ? Math.round(r() * 15) : 0;
    const revenue = Math.round(qty * price * (1 - disc / 100));
    const profit = Math.round(revenue * (margin - disc / 200 + (r() - 0.5) * 0.06));
    out.push({
      "Invoice No": `INV/${d.getUTCFullYear()}/${String(10000 + i)}`,
      "Order Date": ddmmyyyy(d),
      State: state, City: r() < 0.01 ? cities[0].toLowerCase() + " " : pick(r, cities), Region: region,
      Product: p, Category: cat, "Customer ID": pick(r, custs), Salesperson: pick(r, reps),
      "Payment Method": pickW(r, ["UPI", "Cash", "Card", "Net Banking", "Credit"], [45, 22, 18, 8, 7]),
      Quantity: qty, "Unit Price": price, "Discount %": disc, Revenue: revenue, Profit: profit,
      HSN: ["1006", "0713", "1512", "0902", "0901", "6211", "5007", "7615", "7323", "8539", "8414", "3926"][products.findIndex((x) => x[0] === p)],
    });
  }
  // a little mess for the data-quality demo
  for (let i = 0; i < 18; i++) out.push({ ...out[Math.floor(r() * out.length)] });
  for (let i = 0; i < 40; i++) out[Math.floor(r() * out.length)]["Salesperson"] = "";
  for (let i = 0; i < 7; i++) out[Math.floor(r() * out.length)]["Order Date"] = "31/02/2025";
  out.push({ ...out[5], Revenue: 1850000, Profit: 420000, "Invoice No": "INV/2025/BULK1" });
  return out;
}

function ecommerce(r: () => number): Raw {
  const cats: [string, number][] = [["Mobiles", 14999], ["Fashion", 899], ["Beauty", 499], ["Electronics", 3499], ["Home", 1299], ["Books", 349], ["Grocery", 650]];
  return Array.from({ length: 3500 }, (_, i) => {
    const [state, region, cities] = pickW(r, GEO, GEO_W);
    const [cat, price] = pick(r, cats);
    const d = dateIn(r);
    const v = Math.round(price * (0.6 + r() * 0.9));
    const returned = r() < (cat === "Fashion" ? 0.18 : 0.06);
    return { "Order ID": `OD${400000 + i}`, "Order Date": dateStr(d), State: state, City: pick(r, cities), Region: region, Category: cat,
      "Customer ID": `C${10000 + Math.floor(r() * 1500)}`, "Payment Method": pickW(r, ["UPI", "COD", "Card", "EMI", "Wallet"], [52, 21, 15, 7, 5]),
      Channel: pickW(r, ["App", "Web", "mSite"], [68, 22, 10]), "Order Value": v, "Shipping Cost": Math.round(40 + r() * 80),
      Profit: Math.round(v * (0.08 + r() * 0.12)) - (returned ? Math.round(v * 0.2) : 0), Returned: returned ? "Yes" : "No", Pincode: String(110001 + Math.floor(r() * 700000)) };
  });
}

function hr(r: () => number): Raw {
  const depts: [string, number][] = [["Engineering", 1600000], ["Sales", 900000], ["HR", 750000], ["Finance", 1100000], ["Operations", 650000], ["Support", 480000], ["Product", 1900000]];
  return Array.from({ length: 900 }, (_, i) => {
    const [dept, ctc] = pickW(r, depts, [35, 18, 5, 7, 14, 14, 7]);
    const [state, , cities] = pickW(r, GEO, GEO_W);
    const j = dateIn(r, 24, false);
    const c = Math.round(ctc * (0.6 + r() * 1.0) / 1000) * 1000;
    return { "Employee ID": `EMP${2000 + i}`, Name: person(r), PAN: pan(r), Department: dept, Designation: pick(r, ["Associate", "Senior Associate", "Lead", "Manager", "Senior Manager"]),
      State: state, City: pick(r, cities), "Joining Date": dateStr(j), "Annual CTC": c, "Monthly Payroll": Math.round(c / 12),
      "Attendance %": Math.round((82 + r() * 18) * 10) / 10, "Performance Rating": Math.round((2 + r() * 3) * 10) / 10, Gender: pick(r, ["Male", "Female"]), Status: r() < 0.09 ? "Exited" : "Active" };
  });
}

function bank(r: () => number): Raw {
  return Array.from({ length: 4000 }, (_, i) => {
    const [state, region, cities] = pickW(r, GEO, GEO_W);
    const d = dateIn(r, 12, false);
    const type = pickW(r, ["Credit", "Debit"], [45, 55]);
    const ch = pickW(r, ["UPI", "NEFT", "RTGS", "IMPS", "ATM", "Branch"], [48, 16, 4, 14, 12, 6]);
    let amt = ch === "RTGS" ? 200000 + r() * 3000000 : ch === "UPI" ? 50 + r() * 8000 : 500 + r() * 90000;
    if (r() < 0.004) amt *= 40;
    return { "Txn ID": `TXN${9000000 + i}`, "Txn Date": dateStr(d), Branch: `${pick(r, cities)} Main`, City: pick(r, cities), State: state, Region: region,
      "Account No": String(10000000000 + Math.floor(r() * 8999999999)), Channel: ch, Type: type, Amount: Math.round(amt), Segment: pickW(r, ["Retail", "SME", "Corporate"], [70, 22, 8]) };
  });
}

function hospital(r: () => number): Raw {
  const deps: [string, number][] = [["Cardiology", 185000], ["Orthopaedics", 120000], ["General Medicine", 32000], ["Paediatrics", 28000], ["Oncology", 240000], ["Gynaecology", 65000], ["Neurology", 160000]];
  return Array.from({ length: 2600 }, (_, i) => {
    const [dep, bill] = pick(r, deps);
    const d = dateIn(r);
    const los = 1 + Math.floor(r() * (bill > 100000 ? 9 : 4));
    const b = Math.round(bill * (0.5 + r()) * (0.7 + los / 8));
    const [state, , cities] = pickW(r, GEO, GEO_W);
    return { "Admission ID": `ADM${50000 + i}`, "Admit Date": dateStr(d), Department: dep, "Patient Type": pickW(r, ["Cash", "Insurance", "CGHS", "Ayushman Bharat"], [35, 40, 10, 15]),
      State: state, City: pick(r, cities), "Length of Stay": los, "Bill Amount": b, "Operating Cost": Math.round(b * (0.55 + r() * 0.3)), Profit: 0, Readmitted: r() < 0.07 ? "Yes" : "No" };
  }).map((x) => ({ ...x, Profit: (x["Bill Amount"] as number) - (x["Operating Cost"] as number) }));
}

function itSales(r: () => number): Raw {
  const clients = ["Tata Motors", "HDFC Bank", "Reliance Retail", "Infosys BPM", "Zomato", "Mahindra Finance", "Apollo Hospitals", "Asian Paints", "Nykaa", "Ola Electric", "ICICI Lombard", "L&T", "Swiggy", "Airtel", "Bajaj Auto"];
  const reps = Array.from({ length: 9 }, () => person(r));
  return Array.from({ length: 1200 }, (_, i) => {
    const d = dateIn(r);
    const line = pickW(r, ["Cloud Migration", "Data & AI", "App Development", "Managed Services", "Cybersecurity"], [22, 25, 25, 18, 10]);
    const v = Math.round((300000 + r() * 4500000) / 1000) * 1000;
    const [state, region, cities] = pickW(r, GEO, GEO_W);
    return { "Deal ID": `D-${3000 + i}`, "Close Date": dateStr(d), Client: pick(r, clients), "Service Line": line, "Sales Rep": pick(r, reps), Region: region, State: state, City: pick(r, cities),
      "Contract Value": v, Target: Math.round(v * (0.85 + r() * 0.35)), Cost: Math.round(v * (0.55 + r() * 0.3)), Profit: 0, Stage: pickW(r, ["Won", "Won", "Won", "Renewal"], [1, 1, 1, 1]) };
  }).map((x) => ({ ...x, Profit: (x["Contract Value"] as number) - (x.Cost as number) }));
}

function manufacturing(r: () => number): Raw {
  const plants: [string, string][] = [["Pune Plant", "Maharashtra"], ["Sanand Plant", "Gujarat"], ["Hosur Plant", "Tamil Nadu"], ["Pithampur Plant", "Madhya Pradesh"], ["Manesar Plant", "Haryana"]];
  const prods: [string, number, number][] = [["Gear Assembly", 1850, 1320], ["Brake Disc", 920, 640], ["Axle Shaft", 3400, 2600], ["Clutch Plate", 1150, 860], ["Piston Ring Set", 540, 410]];
  const out: Raw = [];
  for (let day = 0; day < 540; day++) {
    const d = new Date(Date.UTC(2024, 9, 1) + day * 86400000);
    for (const [plant, state] of plants) {
      if (r() < 0.4) continue;
      const [p, price, cost] = pick(r, prods);
      const units = Math.round(200 + r() * 800);
      const rej = Math.round(units * (0.01 + r() * 0.05));
      out.push({ "Batch ID": `B${out.length + 70000}`, Date: dateStr(d), Plant: plant, State: state, Product: p, Shift: pick(r, ["A", "B", "C"]),
        "Units Produced": units, "Units Rejected": rej, "Production Cost": units * cost, "Sales Value": (units - rej) * price, Profit: (units - rej) * price - units * cost, "Machine Hours": Math.round(6 + r() * 16) });
    }
  }
  return out;
}

function inventory(r: () => number): Raw {
  const skus: [string, string, number][] = [["Parle-G 800g", "Biscuits", 85], ["Tata Salt 1kg", "Staples", 28], ["Amul Butter 500g", "Dairy", 275], ["Surf Excel 1kg", "Home Care", 140], ["Colgate 200g", "Personal Care", 110], ["Maggi 12-pack", "Packaged Food", 168], ["Aashirvaad Atta 10kg", "Staples", 480], ["Dettol Soap 4x", "Personal Care", 199], ["Haldiram Bhujia 1kg", "Snacks", 260], ["Red Label Tea 1kg", "Beverages", 520]];
  const whs: [string, string][] = [["Bhiwandi WH", "Maharashtra"], ["Gurugram WH", "Haryana"], ["Hoskote WH", "Karnataka"], ["Kolkata WH", "West Bengal"], ["Indore WH", "Madhya Pradesh"], ["Chennai WH", "Tamil Nadu"]];
  const out: Raw = [];
  for (let m = 0; m < 18; m++) {
    const d = new Date(Date.UTC(2024, 9 + m, 28));
    for (const [wh, state] of whs) for (const [sku, cat, price] of skus) {
      const stock = Math.round(200 + r() * 5000);
      const sold = Math.round(stock * (0.3 + r() * 0.8));
      out.push({ "Snapshot Date": dateStr(d), Warehouse: wh, State: state, Product: sku, Category: cat, "Stock On Hand": stock, "Unit Price": price,
        "Units Sold": sold, "Sales Value": sold * price, "Reorder Level": 1000, "Days of Cover": Math.round((stock / Math.max(1, sold)) * 30) });
    }
  }
  return out;
}

const GEN: Record<string, (r: () => number) => Raw> = { retail, ecommerce, hr, bank, hospital, it: itSales, manufacturing, inventory };

export function loadDemo(id: string): Dataset {
  const meta = DEMOS.find((d) => d.id === id)!;
  const ds = buildDataset(meta.name, "Demo dataset", GEN[id](rng(id.length * 7919 + 42)));
  return { ...ds, id: `demo_${id}` };
}
