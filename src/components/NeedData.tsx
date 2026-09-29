import { Link } from "@tanstack/react-router";
import { Database, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useActiveDataset, useStore } from "@/lib/store";
import type { Dataset } from "@/lib/data/types";
import { Button } from "@/components/ui/button";

/** Renders children only when a dataset is active; otherwise a friendly prompt. */
export function NeedData({ children }: { children: (ds: Dataset) => ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const ds = useActiveDataset();
  if (!hydrated) return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  if (!ds) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-xl border bg-card p-8 text-center shadow-card">
        <Database className="mx-auto size-8 text-saffron" />
        <h2 className="mt-3 text-lg font-semibold">No data loaded yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">Upload a file or open a demo dataset to use this page.</p>
        <Button asChild className="mt-5"><Link to="/data">Go to Data</Link></Button>
      </div>
    );
  }
  return <>{children(ds)}</>;
}
