export type WorkflowScheduleType = "after" | "before";

export interface WorkflowStep {
  id: string;
  title: string;
  scheduleType?: WorkflowScheduleType;
  scheduleDays?: number;
  /** Backward-compatible field used by older workflow templates. */
  daysBefore?: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  needsDate: boolean;
  steps: WorkflowStep[];
  builtin?: boolean;
}
