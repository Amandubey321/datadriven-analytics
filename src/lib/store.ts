import { create } from "zustand";
import { persist, createJSONStorage, type StateStorage } from "zustand/middleware";
import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";
import type { Dataset, Filter, QueryResult, QuerySpec } from "./data/types";
import type { Industry } from "./data/industries";
import type { CleanLog } from "./data/quality";

export type AiMode = "samples" | "aggregates";

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  status?: "thinking" | "done" | "error";
  title?: string;
  spec?: QuerySpec;
  result?: QueryResult;
  columnsUsed?: string[];
  kind?: "query" | "forecast" | "summary" | "clarify" | "insufficient" | "export";
  forecast?: { dateColumn: string; valueColumn: string; horizon: string };
}

export interface SavedAnalysis {
  id: string;
  datasetId: string;
  title: string;
  question?: string;
  spec: QuerySpec;
  note?: string;
  createdAt: number;
}

interface State {
  datasets: Dataset[];
  activeId: string | null;
  industry: Industry;
  aiMode: AiMode;
  company: string;
  filters: Filter[];
  chats: Record<string, ChatMsg[]>;
  saved: SavedAnalysis[];
  cleanLogs: Record<string, CleanLog[]>;
  hydrated: boolean;
  addDataset: (d: Dataset, industry?: Industry) => void;
  replaceDataset: (d: Dataset, log?: CleanLog[]) => void;
  removeDataset: (id: string) => void;
  setActive: (id: string) => void;
  setIndustry: (i: Industry) => void;
  setAiMode: (m: AiMode) => void;
  setCompany: (c: string) => void;
  setFilters: (f: Filter[]) => void;
  pushMsg: (dsId: string, m: ChatMsg) => void;
  patchMsg: (dsId: string, id: string, patch: Partial<ChatMsg>) => void;
  clearChat: (dsId: string) => void;
  save: (a: SavedAnalysis) => void;
  unsave: (id: string) => void;
}

const idbStorage: StateStorage = {
  getItem: async (k) => (await idbGet<string>(k)) ?? null,
  setItem: (k, v) => idbSet(k, v),
  removeItem: (k) => idbDel(k),
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      datasets: [],
      activeId: null,
      industry: "retail",
      aiMode: "samples",
      company: "Your Company Pvt. Ltd.",
      filters: [],
      chats: {},
      saved: [],
      cleanLogs: {},
      hydrated: false,
      addDataset: (d, industry) =>
        set((s) => ({ datasets: [...s.datasets.filter((x) => x.id !== d.id), d], activeId: d.id, filters: [], ...(industry ? { industry } : {}) })),
      replaceDataset: (d, log) =>
        set((s) => ({ datasets: s.datasets.map((x) => (x.id === d.id ? d : x)), cleanLogs: log ? { ...s.cleanLogs, [d.id]: log } : s.cleanLogs })),
      removeDataset: (id) =>
        set((s) => {
          const datasets = s.datasets.filter((x) => x.id !== id);
          return { datasets, activeId: s.activeId === id ? (datasets[0]?.id ?? null) : s.activeId };
        }),
      setActive: (id) => set({ activeId: id, filters: [] }),
      setIndustry: (industry) => set({ industry }),
      setAiMode: (aiMode) => set({ aiMode }),
      setCompany: (company) => set({ company }),
      setFilters: (filters) => set({ filters }),
      pushMsg: (dsId, m) => set((s) => ({ chats: { ...s.chats, [dsId]: [...(s.chats[dsId] ?? []), m] } })),
      patchMsg: (dsId, id, patch) =>
        set((s) => ({ chats: { ...s.chats, [dsId]: (s.chats[dsId] ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)) } })),
      clearChat: (dsId) => set((s) => ({ chats: { ...s.chats, [dsId]: [] } })),
      save: (a) => set((s) => ({ saved: [a, ...s.saved] })),
      unsave: (id) => set((s) => ({ saved: s.saved.filter((x) => x.id !== id) })),
    }),
    {
      name: "bharat-analytics",
      storage: createJSONStorage(() => idbStorage),
      skipHydration: true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      partialize: ({ hydrated, ...rest }) => rest,
      onRehydrateStorage: () => () => useStore.setState({ hydrated: true }),
    },
  ),
);

export function useActiveDataset(): Dataset | null {
  return useStore((s) => s.datasets.find((d) => d.id === s.activeId) ?? null);
}

export const uid = () => Math.random().toString(36).slice(2, 10);
