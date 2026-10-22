import { create } from 'zustand';

interface CompareState {
  ids: string[];
  toggle: (id: string) => void;
  add: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  set: (ids: string[]) => void;
}

const MAX = 5;

/** Holds the products selected for side-by-side comparison across pages. */
export const useCompareStore = create<CompareState>((set) => ({
  ids: [],
  toggle: (id) =>
    set((s) => ({
      ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : s.ids.length < MAX ? [...s.ids, id] : s.ids,
    })),
  add: (id) => set((s) => (s.ids.includes(id) || s.ids.length >= MAX ? s : { ids: [...s.ids, id] })),
  remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
  clear: () => set({ ids: [] }),
  set: (ids) => set({ ids: ids.slice(0, MAX) }),
}));
