import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  LayoutDashboard, Database, Bot, BarChart3, FileText, TrendingUp, ShieldCheck, Bookmark, Settings, Menu, X, Moon, Sun,
} from "lucide-react";
import { useActiveDataset, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/data", label: "Data", icon: Database },
  { to: "/analyst", label: "AI Analyst", icon: Bot },
  { to: "/visualizations", label: "Visualizations", icon: BarChart3 },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/forecasts", label: "Forecasts", icon: TrendingUp },
  { to: "/quality", label: "Data Quality", icon: ShieldCheck },
  { to: "/saved", label: "Saved Analyses", icon: Bookmark },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const { company, datasets, activeId, setActive } = useStore();
  const ds = useActiveDataset();

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  return (
    <div className="flex min-h-screen">
      <aside className={cn(
        "no-print fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <Link to="/" className="flex items-center gap-2"><Logo /><span className="font-display text-[15px] font-semibold">Bharat Analytics <span className="text-saffron">AI</span></span></Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="size-5" /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <Link key={to} to={to} className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active ? "bg-sidebar-accent font-semibold text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              )}>
                <Icon className={cn("size-4", active && "text-saffron")} />{label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/60">
          All figures computed from your data. AI never invents numbers.
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-semibold">{company}</div>
            <div className="truncate text-xs text-muted-foreground">{ds ? `${ds.name} · ${ds.rows.length.toLocaleString("en-IN")} rows` : "No dataset loaded"}</div>
          </div>
          {datasets.length > 1 && (
            <select value={activeId ?? ""} onChange={(e) => setActive(e.target.value)} className="hidden h-9 max-w-56 rounded-md border bg-card px-2 text-sm sm:block" aria-label="Active dataset">
              {datasets.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <button onClick={() => setDark((d) => !d)} className="rounded-md p-2 text-muted-foreground hover:bg-secondary" aria-label="Toggle dark mode">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</button>
          <div className="flex size-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground" title="Profile">
            {company.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, children }: { title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="no-print flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
