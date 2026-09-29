import { useRef, useState, type ReactNode } from "react";
import { Download, FileImage, Loader2, MessageSquareText, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ChartView, type ChartData } from "./ChartView";
import type { ChartType } from "@/lib/data/types";
import { downloadBlob, toCSV } from "@/lib/data/query";
import { explainData } from "@/lib/ai.functions";
import { cn } from "@/lib/utils";

export async function exportPNG(el: HTMLElement, name: string) {
  const { toPng } = await import("html-to-image");
  const bg = getComputedStyle(document.body).backgroundColor;
  const url = await toPng(el, { backgroundColor: bg, pixelRatio: 2, filter: (n) => !(n instanceof HTMLElement && n.dataset.noexport === "true") });
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.png`;
  a.click();
}

export function ChartCard({ title, subtitle, type, data, height = 280, actions, method, className, footer }: {
  title: string; subtitle?: string; type: ChartType; data: ChartData; height?: number; actions?: ReactNode; method?: string; className?: string; footer?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const explain = useServerFn(explainData);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const safeName = title.replace(/[^\w]+/g, "-").toLowerCase();

  const onExplain = async () => {
    setBusy(true);
    try {
      const res = await explain({ data: { mode: "chart", title, method, table: data.rows.slice(0, 60) } });
      if (res.ok) setText(res.data);
      else toast.error(res.error);
    } catch {
      toast.error("Couldn't reach the AI. Check your connection and try again.");
    } finally { setBusy(false); }
  };

  return (
    <div ref={ref} className={cn("rounded-xl border bg-card p-4 shadow-card", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-0.5" data-noexport="true">
          {actions}
          <IconBtn label="Explain this chart" onClick={onExplain}>{busy ? <Loader2 className="size-4 animate-spin" /> : <MessageSquareText className="size-4" />}</IconBtn>
          <IconBtn label="Download PNG" onClick={() => ref.current && exportPNG(ref.current, safeName).catch(() => toast.error("PNG export failed."))}><FileImage className="size-4" /></IconBtn>
          <IconBtn label="Download CSV" onClick={() => downloadBlob(toCSV(data.rows, [data.labelKey, ...data.valueKeys]), `${safeName}.csv`, "text/csv")}><Download className="size-4" /></IconBtn>
        </div>
      </div>
      <ChartView type={type} data={data} height={height} />
      {text && (
        <div className="relative mt-3 rounded-lg border border-saffron/40 bg-accent/50 p-3 text-sm">
          <button data-noexport="true" className="absolute right-2 top-2 text-muted-foreground hover:text-foreground" onClick={() => setText(null)} aria-label="Close explanation"><X className="size-4" /></button>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">AI explanation</div>
          <div className="prose-ai"><ReactMarkdown>{text}</ReactMarkdown></div>
        </div>
      )}
      {footer}
    </div>
  );
}

export function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
      {children}
    </button>
  );
}
