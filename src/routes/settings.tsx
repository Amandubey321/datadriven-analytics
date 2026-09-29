import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { INDUSTRIES, type Industry } from "@/lib/data/industries";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Bharat Analytics AI" },
      { name: "description", content: "Company profile, industry-specific dashboards and AI data-sharing controls." },
      { property: "og:title", content: "Settings — Bharat Analytics AI" },
      { property: "og:description", content: "Configure industry and AI privacy." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { company, setCompany, industry, setIndustry, aiMode, setAiMode } = useStore();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Settings" />
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="font-semibold">Company</h2>
        <Input className="mt-3 max-w-md" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company name" />
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="font-semibold">Business type</h2>
        <p className="text-sm text-muted-foreground">Changes KPI names and focus on the dashboard.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(INDUSTRIES) as Industry[]).map((k) => (
            <button key={k} onClick={() => setIndustry(k)} className={cn("rounded-lg border p-3 text-left text-sm", industry === k ? "border-saffron bg-accent" : "hover:bg-secondary")}>
              <div className="font-medium">{INDUSTRIES[k].name}</div>
              <div className="text-xs text-muted-foreground">{INDUSTRIES[k].focus}</div>
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-xl border bg-card p-5 shadow-card">
        <h2 className="font-semibold">What the AI can see</h2>
        <p className="text-sm text-muted-foreground">All calculations happen in the app. PAN, GSTIN, phone, email and account numbers are never shared.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {([["samples", "Summaries + 5 sample rows", "Best answers. Column names, category values, ranges and a small sample."], ["aggregates", "Numbers only", "Column names and category values only — no raw rows ever leave the browser."]] as const).map(([id, t, d]) => (
            <button key={id} onClick={() => setAiMode(id)} className={cn("rounded-lg border p-3 text-left", aiMode === id ? "border-saffron bg-accent" : "hover:bg-secondary")}>
              <div className="text-sm font-medium">{t}</div><div className="text-xs text-muted-foreground">{d}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
