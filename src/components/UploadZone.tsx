import { useCallback, useRef, useState } from "react";
import { Upload, Database } from "lucide-react";
import { parseFile } from "@/lib/data/parse";
import { DEMOS, loadDemo } from "@/lib/data/demo";
import { Pipeline, type PipelineJob } from "./Pipeline";
import { cn } from "@/lib/utils";

export function UploadZone({ compact }: { compact?: boolean }) {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const done = useCallback(() => setJob(null), []);
  const onFile = (f: File | undefined) => { if (f) setJob({ load: () => parseFile(f), label: f.name }); };

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); onFile(e.dataTransfer.files[0]); }}
        onClick={() => input.current?.click()}
        className={cn("cursor-pointer rounded-xl border-2 border-dashed bg-card text-center transition-colors hover:border-saffron", drag ? "border-saffron bg-accent/40" : "border-border", compact ? "p-6" : "p-10")}
      >
        <Upload className="mx-auto size-8 text-saffron" />
        <div className="mt-3 font-semibold">Drop a file here or click to browse</div>
        <div className="mt-1 text-xs text-muted-foreground">CSV, TSV, TXT, Excel (XLSX/XLS/XLSM/XLSB), ODS, Numbers, JSON, JSONL, XML, HTML, DBF · up to 50 MB · processed in your browser</div>
        <input ref={input} type="file" accept=".csv,.txt,.tsv,.psv,.dat,.tab,.xlsx,.xls,.xlsm,.xlsb,.ods,.fods,.numbers,.dbf,.html,.htm,.json,.jsonl,.ndjson,.xml" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <Pipeline job={job} onDone={done} />
    </>
  );
}

export function DemoGrid({ onPick }: { onPick?: () => void }) {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const done = useCallback(() => setJob(null), []);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEMOS.map((d) => (
          <button key={d.id} onClick={() => { onPick?.(); setJob({ load: async () => loadDemo(d.id), industry: d.industry, label: d.name, autoClean: false }); }}
            className="group rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-saffron">
            <Database className="size-4 text-muted-foreground group-hover:text-saffron" />
            <div className="mt-2 text-sm font-semibold">{d.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">{d.description}</div>
          </button>
        ))}
      </div>
      <Pipeline job={job} onDone={done} />
    </>
  );
}

export function useDemoLauncher() {
  const [job, setJob] = useState<PipelineJob | null>(null);
  const done = useCallback(() => setJob(null), []);
  const start = () => setJob({ load: async () => loadDemo("retail"), industry: "retail", label: "Retail sales demo", autoClean: true });
  return { start, node: <Pipeline job={job} onDone={done} /> };
}
