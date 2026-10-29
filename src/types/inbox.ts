export type RepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "interval";

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface InboxItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string | null;
  deletedAt?: string | null;
  projectId: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  repeatType?: RepeatType;
  repeatInterval?: number;
  note?: string;
  subtasks?: Subtask[];
}

export interface NewTaskOptions {
  projectId?: string | null;
  dueDate?: string | null;
  reminderAt?: string | null;
  repeatType?: RepeatType;
  repeatInterval?: number;
  note?: string;
  subtasks?: Subtask[];
}
