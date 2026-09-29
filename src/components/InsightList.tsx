import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb, ShieldAlert, ListChecks } from "lucide-react";
import type { Insight, InsightKind } from "@/lib/data/analytics";
import { cn } from "@/lib/utils";

const META: Record<InsightKind, { label: string; icon: typeof TrendingUp; cls: string }> = {
  positive: { label: "Positive trends", icon: TrendingUp, cls: "text-positive" },
  negative: { label: "Negative trends", icon: TrendingDown, cls: "text-negative" },
  anomaly: { label: "Anomalies", icon: AlertTriangle, cls: "text-warning" },
  opportunity: { label: "Opportunities", icon: Lightbulb, cls: "text-saffron" },
  risk: { label: "Risks", icon: ShieldAlert, cls: "text-negative" },
  recommendation: { label: "Recommendations", icon: ListChecks, cls: "text-primary" },
};

export function InsightList({ insights }: { insights: Insight[] }) {
  if (!insights.length) return <p className="text-sm text-muted-foreground">Not enough data to generate insights for this selection.</p>;
  const kinds = (Object.keys(META) as InsightKind[]).filter((k) => insights.some((i) => i.kind === k));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {kinds.map((k) => {
        const { label, icon: Icon, cls } = META[k];
        return (
          <div key={k}>
            <div className={cn("mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", cls)}><Icon className="size-3.5" />{label}</div>
            <ul className="space-y-1.5">
              {insights.filter((i) => i.kind === k).map((i, n) => (
                <li key={n} className="text-sm leading-snug" title={`Basis: ${i.basis}`}>
                  {i.text}
                  <span className="ml-1 font-mono text-[10px] text-muted-foreground">[{i.basis}]</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
