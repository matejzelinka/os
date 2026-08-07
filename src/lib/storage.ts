import { markLocalChange } from "@/lib/sync";
import type { InboxItem } from "@/types/inbox";
import type { Project } from "@/types/project";

const INBOX_KEY = "os-inbox";
const PROJECTS_KEY = "os-projects";

// ---------- INBOX ----------

export function loadInbox(): InboxItem[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(INBOX_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveInbox(items: InboxItem[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(INBOX_KEY, JSON.stringify(items)); markLocalChange();
}

// ---------- PROJECTS ----------

export function loadProjects(): Project[] {
  if (typeof window === "undefined") return [];

  const data = localStorage.getItem(PROJECTS_KEY);

  if (!data) return [];

  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveProjects(projects: Project[]) {
  if (typeof window === "undefined") return;

  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); markLocalChange();
}

const WORKFLOWS_KEY = "os-workflows";
export function loadCustomWorkflows() { if(typeof window === "undefined") return []; try { return JSON.parse(localStorage.getItem(WORKFLOWS_KEY) || "[]"); } catch { return []; } }
export function saveCustomWorkflows(items: unknown[]) { if(typeof window !== "undefined") localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(items)); markLocalChange(); }

export function exportAllData() { if(typeof window === "undefined") return {}; return { version:1, exportedAt:new Date().toISOString(), inbox:loadInbox(), projects:loadProjects(), workflows:loadCustomWorkflows() }; }
export function importAllData(data:any) { if(typeof window === "undefined") return false; if(!data || !Array.isArray(data.inbox) || !Array.isArray(data.projects)) return false; saveInbox(data.inbox); saveProjects(data.projects); if(Array.isArray(data.workflows)) saveCustomWorkflows(data.workflows); return true; }
