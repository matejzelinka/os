import type { WorkflowTemplate } from "@/types/workflow";

export type ProjectRepeatType =
  | "none"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "interval";

export interface Project {
  id: string;
  name: string;
  color: string;
  archived: boolean;
  createdAt: string;
  repeatType?: ProjectRepeatType;
  repeatInterval?: number;
  eventDate?: string | null;
  preparationStartDate?: string | null;
  repeatNextDate?: string | null;
  repeatNextPreparationDate?: string | null;
  repeatAnchorDate?: string | null;
  workflowSnapshot?: WorkflowTemplate | null;
}
