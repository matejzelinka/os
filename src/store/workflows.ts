import { create } from "zustand";
import type { WorkflowTemplate } from "@/types/workflow";
import { normalizeWorkflow } from "@/lib/workflows";
import { loadCustomWorkflows, saveCustomWorkflows } from "@/lib/storage";
import { createId } from "@/lib/ids";

interface Store {
  custom: WorkflowTemplate[];
  add: (name: string, description: string) => string;
  remove: (id: string) => void;
  update: (id: string, changes: Partial<WorkflowTemplate>) => void;
}

export const useWorkflowStore = create<Store>((set) => ({
  custom: loadCustomWorkflows().map(normalizeWorkflow),
  add: (name, description) => {
    const id = createId();
    set((state) => {
      const custom = [
        ...state.custom,
        { id, name, description, needsDate: false, steps: [] },
      ];
      saveCustomWorkflows(custom);
      return { custom };
    });
    return id;
  },
  remove: (id) =>
    set((state) => {
      const custom = state.custom.filter((w) => w.id !== id);
      saveCustomWorkflows(custom);
      return { custom };
    }),
  update: (id, changes) =>
    set((state) => {
      const custom = state.custom.map((w) =>
        w.id === id ? normalizeWorkflow({ ...w, ...changes }) : w
      );
      saveCustomWorkflows(custom);
      return { custom };
    }),
}));

export function allWorkflows(custom: WorkflowTemplate[]) {
  return custom.map(normalizeWorkflow);
}
