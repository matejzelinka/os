import { create } from "zustand";
import type { Project, ProjectRepeatType } from "@/types/project";
import type { WorkflowTemplate } from "@/types/workflow";
import type { InboxItem } from "@/types/inbox";
import { createId } from "@/lib/ids";
import { loadInbox, loadProjects, saveInbox, saveProjects } from "@/lib/storage";
import { normalizeWorkflow, getWorkflowStepDueDate } from "@/lib/workflows";

function dateOnly(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function nextDate(value: string, type: ProjectRepeatType, interval = 1) {
  const d = new Date(`${value}T12:00:00`);
  if (Number.isNaN(d.getTime()) || type === "none") return null;
  switch (type) {
    case "daily": d.setDate(d.getDate() + 1); break;
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": {
      const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last)); break;
    }
    case "yearly": {
      const day = d.getDate(); d.setDate(1); d.setFullYear(d.getFullYear() + 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last)); break;
    }
    case "interval": d.setDate(d.getDate() + Math.max(1, interval)); break;
  }
  return dateOnly(d);
}

function shiftDate(value: string | null | undefined, from: string, to: string) {
  if (!value) return value ?? null;
  const d = new Date(`${value}T12:00:00`);
  const a = new Date(`${from}T12:00:00`);
  const b = new Date(`${to}T12:00:00`);
  if ([d, a, b].some((x) => Number.isNaN(x.getTime()))) return value;
  d.setDate(d.getDate() + Math.round((b.getTime() - a.getTime()) / 86400000));
  return dateOnly(d);
}

function materialize(projects: Project[], inbox: InboxItem[]) {
  const now = dateOnly(new Date());
  let nextProjects = projects.map((p) => ({ ...p }));
  let nextInbox = [...inbox];

  for (let index = 0; index < nextProjects.length; index++) {
    const source = nextProjects[index];
    if (!source.repeatType || source.repeatType === "none" || !source.repeatNextDate) continue;
    let occurrence = source.repeatNextDate;
    const anchor = source.repeatAnchorDate || source.eventDate || dateOnly(new Date(source.createdAt));

    while (occurrence && occurrence <= now) {
      const childId = createId();
      const createdAt = new Date().toISOString();
      const workflow = source.workflowSnapshot ? normalizeWorkflow(source.workflowSnapshot) : null;
      const preparationDate = source.repeatNextPreparationDate || source.preparationStartDate || null;
      const sourceTasks = nextInbox.filter((task) => task.projectId === source.id && !task.deletedAt);
      const child: Project = {
        id: childId,
        name: source.name,
        color: source.color,
        archived: false,
        createdAt,
        repeatType: "none",
        repeatInterval: 1,
        eventDate: occurrence,
        preparationStartDate: preparationDate,
        repeatNextDate: null,
        repeatNextPreparationDate: null,
        repeatAnchorDate: occurrence,
        workflowSnapshot: workflow,
      };

      if (workflow) {
        const eventDate = occurrence;
        const created = new Date(createdAt);
        const tasks = workflow.steps.map((step) => ({
          id: createId(),
          title: step.title,
          completed: false,
          createdAt,
          completedAt: null,
          deletedAt: null,
          projectId: childId,
          dueDate: getWorkflowStepDueDate(step, eventDate, preparationDate, created),
          reminderAt: null,
          repeatType: "none" as const,
          repeatInterval: 1,
          note: "",
          subtasks: [],
        }));
        nextInbox = [...tasks, ...nextInbox];
      } else {
        const copies = sourceTasks.map((task) => ({
          ...task,
          id: createId(),
          projectId: childId,
          completed: false,
          completedAt: null,
          deletedAt: null,
          createdAt,
          dueDate: shiftDate(task.dueDate, anchor, occurrence),
          reminderAt: null,
          repeatType: "none" as const,
          repeatInterval: 1,
          subtasks: (task.subtasks ?? []).map((s) => ({ ...s, id: createId(), completed: false })),
        }));
        nextInbox = [...copies, ...nextInbox];
      }

      nextProjects = [...nextProjects, child];
      const nextPreparation = preparationDate ? nextDate(preparationDate, source.repeatType, source.repeatInterval) : null;
      occurrence = nextDate(occurrence, source.repeatType, source.repeatInterval);
      source.repeatNextPreparationDate = nextPreparation;
    }

    nextProjects = nextProjects.map((p) =>
      p.id === source.id ? { ...p, repeatNextDate: occurrence, repeatNextPreparationDate: source.repeatNextPreparationDate ?? null } : p
    );
  }
  return { projects: nextProjects, inbox: nextInbox };
}

interface ProjectsStore {
  projects: Project[];
  addProject: (name: string) => void;
  createProject: (name: string) => string;
  createWorkflowProject: (name: string, workflow: WorkflowTemplate, eventDate: string | null, preparationStartDate?: string | null, repeatType?: ProjectRepeatType, repeatInterval?: number) => string;
  updateProject: (id: string, changes: Partial<Pick<Project, "name" | "color" | "archived" | "eventDate" | "preparationStartDate" | "repeatType" | "repeatInterval" | "repeatNextDate" | "repeatNextPreparationDate" | "repeatAnchorDate">>) => void;
  deleteProject: (id: string) => void;
}

const initial = materialize(loadProjects(), loadInbox());
if (typeof window !== "undefined" && (initial.projects.length !== loadProjects().length || initial.inbox.length !== loadInbox().length)) {
  saveProjects(initial.projects);
  saveInbox(initial.inbox);
}

export const useProjectsStore = create<ProjectsStore>((set) => ({
  projects: initial.projects,
  addProject: (name) => set((state) => {
    const projects = [{ id: createId(), name, color: "#2563eb", archived: false, createdAt: new Date().toISOString() }, ...state.projects];
    saveProjects(projects); return { projects };
  }),
  createProject: (name) => {
    const id = createId();
    set((state) => {
      const projects = [{ id, name, color: "#2563eb", archived: false, createdAt: new Date().toISOString() }, ...state.projects];
      saveProjects(projects); return { projects };
    });
    return id;
  },
  createWorkflowProject: (name, workflow, eventDate, preparationStartDate = null, repeatType = "none", repeatInterval = 1) => {
    const id = createId();
    const createdAt = new Date().toISOString();
    const normalized = normalizeWorkflow(workflow);
    const type = repeatType === "none" ? "none" : repeatType;
    const interval = Math.max(1, repeatInterval || 1);
    const project: Project = {
      id, name, color: "#2563eb", archived: false, createdAt,
      eventDate: eventDate || null,
      preparationStartDate: preparationStartDate || null,
      repeatType: type, repeatInterval: interval,
      repeatNextDate: type === "none" ? null : (eventDate ? nextDate(eventDate, type, interval) : null),
      repeatNextPreparationDate: type === "none" ? null : (preparationStartDate ? nextDate(preparationStartDate, type, interval) : null),
      repeatAnchorDate: eventDate || dateOnly(new Date()),
      workflowSnapshot: normalized,
    };
    const currentProjects = loadProjects();
    const currentInbox = loadInbox();
    const tasks = normalized.steps.map((step) => ({
      id: createId(), title: step.title, completed: false, createdAt,
      completedAt: null, deletedAt: null, projectId: id,
      dueDate: getWorkflowStepDueDate(step, eventDate, preparationStartDate || null, new Date()),
      reminderAt: null, repeatType: "none" as const, repeatInterval: 1, note: "", subtasks: [],
    }));
    const projects = [project, ...currentProjects];
    const inbox = [...tasks, ...currentInbox];
    saveProjects(projects); saveInbox(inbox);
    set({ projects });
    return id;
  },
  updateProject: (id, changes) => set((state) => {
    const projects = state.projects.map((p) => p.id === id ? { ...p, ...changes } : p);
    saveProjects(projects); return { projects };
  }),
  deleteProject: (id) => set((state) => {
    const projects = state.projects.filter((p) => p.id !== id);
    saveProjects(projects); return { projects };
  }),
}));

export { nextDate };
