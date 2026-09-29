import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { formatKPI, type KPI } from "@/lib/data/analytics";
import { cn } from "@/lib/utils";

export function KpiCard({ k, previousLabel }: { k: KPI; previousLabel?: string }) {
  const up = (k.change ?? 0) > 0;
  const costLike = k.id === "expenses";
  const good = k.change == null ? null : costLike ? !up : up;
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card" title={k.hint}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</div>
      <div className="mt-1.5 font-display text-2xl font-semibold">{formatKPI(k)}</div>
      <div className="mt-1 flex items-center gap-1 text-xs">
        {k.change == null ? (
          <span className="flex items-center gap-1 text-muted-foreground"><Minus className="size-3" />No prior period</span>
        ) : (
          <>
            <span className={cn("flex items-center font-semibold", good ? "text-positive" : "text-negative")}>
              {up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(k.change).toFixed(1)}%
            </span>
            <span className="truncate text-muted-foreground">vs {previousLabel || "previous"} ({formatKPI(k, k.previous)})</span>
          </>
        )}
      </div>
    </div>
  );
}
