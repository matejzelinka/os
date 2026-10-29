import type { WorkflowScheduleType, WorkflowStep, WorkflowTemplate } from "@/types/workflow";

function formatDate(date: Date) {
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function dateBefore(date: string, days = 0) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() - Math.max(0, days));
  return formatDate(d);
}

export function dateAfter(date: string, days = 0) {
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + Math.max(0, days));
  return formatDate(d);
}

function datePlus(base: Date, days = 0) {
  const d = new Date(base);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, days));
  return formatDate(d);
}

export function getWorkflowStepDueDate(
  step: WorkflowStep,
  eventDate: string | null,
  preparationStartDate: string | null = null,
  createdAt: Date = new Date(),
) {
  const type: WorkflowScheduleType =
    step.scheduleType === "before" ? "before" : "after";
  const days = Math.max(0, step.scheduleDays ?? step.daysBefore ?? 0);

  switch (type) {
    case "after":
      return preparationStartDate ? datePlus(new Date(`${preparationStartDate}T12:00:00`), days) : datePlus(createdAt, days);
    case "before":
      return eventDate ? dateBefore(eventDate, days) : null;
    default:
      return null;
  }
}

export function normalizeWorkflowStep(step: WorkflowStep): WorkflowStep {
  const days = Math.max(0, step.scheduleDays ?? step.daysBefore ?? 0);
  const scheduleType: WorkflowScheduleType =
    step.scheduleType === "before" ? "before" : "after";
  return {
    ...step,
    scheduleType,
    scheduleDays: days,
    daysBefore: days,
  };
}

export function normalizeWorkflow(workflow: WorkflowTemplate): WorkflowTemplate {
  const steps = workflow.steps.map(normalizeWorkflowStep);
  return {
    ...workflow,
    steps,
    needsDate: steps.some((step) => step.scheduleType === "before"),
  };
}
