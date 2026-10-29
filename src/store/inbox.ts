import { create } from "zustand";
import type { InboxItem, NewTaskOptions } from "@/types/inbox";
import { createId } from "@/lib/ids";
import { loadInbox, saveInbox } from "@/lib/storage";
import { deleteTaskAttachments } from "@/lib/attachments";

type Editable = Pick<
  InboxItem,
  "title" | "projectId" | "dueDate" | "reminderAt" |
  "repeatType" | "repeatInterval" | "note" | "subtasks"
>;

interface Store {
  inbox: InboxItem[];
  addInbox: (title: string, options?: NewTaskOptions) => string;
  addManyInbox: (items: Array<{ title: string; options?: NewTaskOptions }>) => void;
  toggleInbox: (id: string) => void;
  deleteInbox: (id: string) => void;
  restoreInbox: (id: string) => void;
  permanentlyDelete: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  cleanupTrash: () => Promise<void>;
  updateInbox: (id: string, changes: Partial<Editable>) => void;
  assignInboxToProject: (id: string, projectId: string | null) => void;
  setDueDate: (id: string, dueDate: string | null) => void;
  addSubtask: (id: string, title: string) => void;
  toggleSubtask: (id: string, subtaskId: string) => void;
  deleteSubtask: (id: string, subtaskId: string) => void;
}

const normalize = (item: InboxItem): InboxItem => ({
  ...item,
  projectId: item.projectId ?? null,
  dueDate: item.dueDate ?? null,
  reminderAt: item.reminderAt ?? null,
  repeatType: item.repeatType ?? "none",
  repeatInterval: item.repeatInterval ?? 1,
  note: item.note ?? "",
  subtasks: item.subtasks ?? [],
  completedAt: item.completedAt ?? null,
  deletedAt: item.deletedAt ?? null,
});

function nextDueDate(
  dueDate: string | null | undefined,
  repeatType: InboxItem["repeatType"],
  repeatInterval = 1,
): string | null {
  if (!dueDate || !repeatType || repeatType === "none") return null;

  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const originalDay = date.getDate();

  switch (repeatType) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly": {
      date.setDate(1);
      date.setMonth(date.getMonth() + 1);
      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();
      date.setDate(Math.min(originalDay, lastDay));
      break;
    }
    case "yearly": {
      date.setDate(1);
      date.setFullYear(date.getFullYear() + 1);
      const lastDay = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate();
      date.setDate(Math.min(originalDay, lastDay));
      break;
    }
    case "interval":
      date.setDate(date.getDate() + (repeatInterval > 0 ? repeatInterval : 1));
      break;
    default:
      return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftReminder(
  oldDueDate: string | null | undefined,
  newDueDate: string | null,
  reminderAt: string | null | undefined,
): string | null {
  if (!reminderAt || !newDueDate || !oldDueDate) return reminderAt ?? null;

  const oldDue = new Date(`${oldDueDate}T00:00:00`);
  const oldReminder = new Date(reminderAt);
  const newDue = new Date(`${newDueDate}T00:00:00`);

  if (
    Number.isNaN(oldDue.getTime()) ||
    Number.isNaN(oldReminder.getTime()) ||
    Number.isNaN(newDue.getTime())
  ) return reminderAt;

  const offset = oldReminder.getTime() - oldDue.getTime();
  const nextReminder = new Date(newDue.getTime() + offset);
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${nextReminder.getFullYear()}-${pad(nextReminder.getMonth() + 1)}-${pad(nextReminder.getDate())}T${pad(nextReminder.getHours())}:${pad(nextReminder.getMinutes())}`;
}

export const useInboxStore = create<Store>((set, get) => ({
  inbox: loadInbox().map(normalize),

  addInbox: (title, options = {}) => {
    const item: InboxItem = {
      id: createId(),
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
      deletedAt: null,
      projectId: options.projectId ?? null,
      dueDate: options.dueDate ?? null,
      reminderAt: options.reminderAt ?? null,
      repeatType: options.repeatType ?? "none",
      repeatInterval: options.repeatInterval ?? 1,
      note: options.note ?? "",
      subtasks: options.subtasks ?? [],
    };

    set((state) => {
      const inbox = [item, ...state.inbox];
      saveInbox(inbox);
      return { inbox };
    });

    return item.id;
  },

  addManyInbox: (items) =>
    set((state) => {
      const createdAt = new Date().toISOString();
      const created = items.map(({ title, options = {} }) => ({
        id: createId(),
        title,
        completed: false,
        createdAt,
        completedAt: null,
        deletedAt: null,
        projectId: options.projectId ?? null,
          dueDate: options.dueDate ?? null,
        reminderAt: options.reminderAt ?? null,
        repeatType: options.repeatType ?? "none",
        repeatInterval: options.repeatInterval ?? 1,
        note: options.note ?? "",
        subtasks: options.subtasks ?? [],
      }));
      const inbox = [...created, ...state.inbox];
      saveInbox(inbox);
      return { inbox };
    }),

  toggleInbox: (id) =>
    set((state) => {
      const task = state.inbox.find((item) => item.id === id);
      if (!task) return state;

      const completedAt = new Date().toISOString();
      const nextDue = nextDueDate(task.dueDate, task.repeatType, task.repeatInterval);
      const recurring = Boolean(task.repeatType && task.repeatType !== "none");

      if (recurring && nextDue) {
        const nextTask: InboxItem = {
          id: createId(),
          title: task.title,
          completed: false,
          createdAt: completedAt,
          completedAt: null,
          deletedAt: null,
          projectId: task.projectId,
          dueDate: nextDue,
          reminderAt: shiftReminder(task.dueDate, nextDue, task.reminderAt),
          repeatType: task.repeatType,
          repeatInterval: task.repeatInterval,
          note: task.note,
          subtasks: (task.subtasks ?? []).map((subtask) => ({
            id: createId(),
            title: subtask.title,
            completed: false,
          })),
        };

        const inbox = state.inbox.map((item) =>
          item.id === id
            ? { ...item, completed: true, completedAt, deletedAt: completedAt }
            : item
        );
        inbox.unshift(nextTask);
        saveInbox(inbox);
        return { inbox };
      }

      const inbox = state.inbox.map((item) =>
        item.id === id
          ? { ...item, completed: true, completedAt, deletedAt: completedAt }
          : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  deleteInbox: (id) =>
    set((state) => {
      const deletedAt = new Date().toISOString();
      const inbox = state.inbox.map((item) =>
        item.id === id ? { ...item, deletedAt } : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  restoreInbox: (id) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id
          ? { ...item, completed: false, completedAt: null, deletedAt: null }
          : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  permanentlyDelete: async (id) => {
    await deleteTaskAttachments(id);
    set((state) => {
      const inbox = state.inbox.filter((item) => item.id !== id);
      saveInbox(inbox);
      return { inbox };
    });
  },

  emptyTrash: async () => {
    const deleted = get().inbox.filter((item) => item.deletedAt);
    await Promise.all(deleted.map((item) => deleteTaskAttachments(item.id)));
    set((state) => {
      const inbox = state.inbox.filter((item) => !item.deletedAt);
      saveInbox(inbox);
      return { inbox };
    });
  },

  cleanupTrash: async () => {
    const limit = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const deleted = get().inbox.filter(
      (item) =>
        item.deletedAt &&
        new Date(item.deletedAt).getTime() < limit
    );
    await Promise.all(deleted.map((item) => deleteTaskAttachments(item.id)));
    const ids = new Set(deleted.map((item) => item.id));
    set((state) => {
      const inbox = state.inbox.filter((item) => !ids.has(item.id));
      saveInbox(inbox);
      return { inbox };
    });
  },

  updateInbox: (id, changes) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id ? normalize({ ...item, ...changes }) : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  assignInboxToProject: (id, projectId) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id ? { ...item, projectId } : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  setDueDate: (id, dueDate) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id ? { ...item, dueDate } : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  addSubtask: (id, title) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id
          ? {
              ...item,
              subtasks: [
                ...(item.subtasks ?? []),
                { id: createId(), title, completed: false },
              ],
            }
          : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  toggleSubtask: (id, subtaskId) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id
          ? {
              ...item,
              subtasks: (item.subtasks ?? []).map((subtask) =>
                subtask.id === subtaskId
                  ? { ...subtask, completed: !subtask.completed }
                  : subtask
              ),
            }
          : item
      );
      saveInbox(inbox);
      return { inbox };
    }),

  deleteSubtask: (id, subtaskId) =>
    set((state) => {
      const inbox = state.inbox.map((item) =>
        item.id === id
          ? {
              ...item,
              subtasks: (item.subtasks ?? []).filter(
                (subtask) => subtask.id !== subtaskId
              ),
            }
          : item
      );
      saveInbox(inbox);
      return { inbox };
    }),
}));
