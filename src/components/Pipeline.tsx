import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Dataset } from "@/lib/data/types";
import { useStore } from "@/lib/store";
import type { Industry } from "@/lib/data/industries";
import { profileDataset, cleanDataset } from "@/lib/data/quality";
import { generateInsights, detectAnomalies, getRoles } from "@/lib/data/analytics";
import { forecast } from "@/lib/data/forecast";

const STEPS = ["Reading file", "Profiling columns", "Checking data quality", "Cleaning data", "Computing KPIs", "Choosing visualisations", "Generating insights", "Detecting anomalies", "Building forecast", "Creating dashboard"];

export type PipelineJob = { load: () => Promise<Dataset>; industry?: Industry; autoClean?: boolean; label: string };

export function Pipeline({ job, onDone }: { job: PipelineJob | null; onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [notes, setNotes] = useState<string[]>([]);
  const navigate = useNavigate();
  const addDataset = useStore((s) => s.addDataset);
  const replaceDataset = useStore((s) => s.replaceDataset);

  useEffect(() => {
    if (!job) return;
    let cancelled = false;
    const tick = (ms = 260) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      setStep(0); setNotes([]);
      try {
        await tick(100);
        let ds = await job.load();
        if (cancelled) return;
        setStep(1); await tick();
        const R = getRoles(ds);
        setNotes((n) => [...n, `${ds.columns.length} columns · ${ds.rows.length.toLocaleString("en-IN")} rows · ${ds.columns.filter((c) => c.type === "number").length} numeric, ${ds.columns.filter((c) => c.type === "date").length} date`]);
        setStep(2); await tick();
        const rep = profileDataset(ds);
        setNotes((n) => [...n, `Quality score ${rep.score}/100 · ${rep.duplicates} duplicates · ${rep.missingTotal} missing · ${rep.invalidTotal} invalid`]);
        setStep(3); await tick();
        addDataset(ds, job.industry);
        if (job.autoClean) {
          const { dataset, log } = cleanDataset(ds, rep);
          ds = dataset;
          replaceDataset(ds, log);
          setNotes((n) => [...n, `Cleaned: ${log.map((l) => `${l.count} ${l.label.toLowerCase()}`).join(", ") || "nothing to fix"}`]);
        }
        setStep(4); await tick();
        setStep(5); await tick();
        setStep(6); await tick();
        const ins = generateInsights(ds, ds.rows);
        setNotes((n) => [...n, `${ins.length} insights found`]);
        setStep(7); await tick();
        const an = detectAnomalies(ds, ds.rows);
        setNotes((n) => [...n, `${an.length} unusual records flagged`]);
        setStep(8); await tick();
        if (R.date && R.revenue) forecast(ds, R.date.name, R.revenue.name, "3m");
        setStep(9); await tick(400);
        setStep(10);
        await tick(300);
        if (cancelled) return;
        onDone();
        navigate({ to: !job.autoClean && rep.score < 90 ? "/quality" : "/" });
        if (!job.autoClean && rep.score < 90) toast.info(`Data quality is ${rep.score}/100. Review the issues before analysis.`);
      } catch (e) {
        onDone();
        toast.error(e instanceof Error ? e.message : "Couldn't read this file.");
      }
    })();
    return () => { cancelled = true; };
  }, [job, addDataset, replaceDataset, navigate, onDone]);

  return (
    <Dialog open={!!job} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Analysing {job?.label}</DialogTitle>
          <DialogDescription>Everything is calculated from your data, in your browser.</DialogDescription>
        </DialogHeader>
        <ol className="space-y-1.5">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              {i < step ? <Check className="size-4 text-positive" /> : i === step ? <Loader2 className="size-4 animate-spin text-saffron" /> : <span className="size-4 rounded-full border" />}
              <span className={i <= step ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>
        {notes.length > 0 && <div className="mt-2 space-y-1 rounded-md bg-secondary p-3 font-mono text-[11px] text-muted-foreground">{notes.map((n) => <div key={n}>› {n}</div>)}</div>}
      </DialogContent>
    </Dialog>
  );
}
