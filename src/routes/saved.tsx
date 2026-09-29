import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { NeedData } from "@/components/NeedData";
import { ChartCard, IconBtn } from "@/components/charts/ChartCard";
import { useStore } from "@/lib/store";
import { runQuery, specToSQL } from "@/lib/data/query";
import type { Dataset } from "@/lib/data/types";

export const Route = createFileRoute("/saved")({
  head: () => ({
    meta: [
      { title: "Saved Analyses — Bharat Analytics AI" },
      { name: "description", content: "Charts and analyses you saved from the AI Analyst and visualization builder, recalculated on current data." },
      { property: "og:title", content: "Saved Analyses — Bharat Analytics AI" },
      { property: "og:description", content: "Your saved charts and analyses." },
    ],
  }),
  component: () => <NeedData>{(ds) => <Saved ds={ds} />}</NeedData>,
});

function Saved({ ds }: { ds: Dataset }) {
  const { saved, unsave } = useStore();
  const mine = saved.filter((s) => s.datasetId === ds.id);
  return (
    <div>
      <PageHeader title="Saved analyses" description={`Saved for “${ds.name}”. Charts recalculate from the current data.`} />
      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing saved yet. Use the bookmark icon in the <Link to="/analyst" className="underline">AI Analyst</Link> or the save button in <Link to="/visualizations" className="underline">Visualizations</Link>.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {mine.map((s) => {
            let data;
            try { data = runQuery(ds, s.spec); } catch { return <div key={s.id} className="rounded-xl border bg-card p-4 text-sm">“{s.title}” can't be recalculated — a column it uses is missing.</div>; }
            return <ChartCard key={s.id} title={s.title} subtitle={s.question} type={s.spec.chart} data={data} method={specToSQL(s.spec)} actions={<IconBtn label="Delete" onClick={() => unsave(s.id)}><Trash2 className="size-4" /></IconBtn>} />;
          })}
        </div>
      )}
    </div>
  );
}
