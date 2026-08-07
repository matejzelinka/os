import type { TaskPriority } from "@/types/inbox";
export interface WorkflowStep {
  id: string;
  title: string;
  daysBefore: number;
  priority: TaskPriority;
}
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  needsDate: boolean;
  steps: WorkflowStep[];
  builtin?: boolean;
}
