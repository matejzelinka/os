import { useEffect, useMemo, useState } from "react";
import { Bell, Brain, FolderKanban, Sparkles } from "lucide-react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { useWorkflowStore, allWorkflows } from "@/store/workflows";
import { recognizeWorkflow } from "@/lib/planner";
import type { ProjectRepeatType } from "@/types/project";

function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateFromText(text: string) {
  const input = text.toLocaleLowerCase("cs");
  const today = new Date();

  if (input.includes("z\u00edtra")) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return toDateValue(tomorrow);
  }

  if (/\bdo\s+p\u00e1tku\b/.test(input)) {
    const friday = new Date(today);
    friday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7));
    return toDateValue(friday);
  }

  const match = input.match(/\b(\d{1,2})\.\s*(\d{1,2})\.(?:\s*(\d{4}))?/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = match[3] ? Number(match[3]) : today.getFullYear();
  let result = new Date(year, month - 1, day);
  if (result.getMonth() !== month - 1 || result.getDate() !== day) return null;

  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!match[3] && result < startOfToday) {
    year += 1;
    result = new Date(year, month - 1, day);
  }

  return toDateValue(result);
}


function displayDate(value: string) {
  return new Intl.DateTimeFormat("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

function isProjectCandidate(text: string) {
  const input = text.toLocaleLowerCase("cs");
  return [
    "p\u0159ipravit",
    "uspo\u0159\u00e1dat",
    "zorganizovat",
    "vytvo\u0159it",
    "spustit",
    "napl\u00e1novat",
  ].some((word) => input.includes(word));
}

function scheduleLabel(
  type: string | undefined,
  days: number,
) {
  if (type === "create") return "Při vytvoření";
  if (type === "after") return `Za ${days} dní`;
  if (type === "before") return `${days} dní před akcí`;
  return `${days} dní po akci`;
}

export default function CaptureBox() {
  const [text, setText] = useState(""),
    [date, setDate] = useState(""),
    [reminderAt, setReminderAt] = useState(""),
    [projectId, setProjectId] = useState(""),
    [workflowId, setWorkflowId] = useState(""),
    [preparationStartDate, setPreparationStartDate] = useState(""),
    [repeatType, setRepeatType] = useState<ProjectRepeatType>("none"),
    [repeatInterval, setRepeatInterval] = useState(1),
    [message, setMessage] = useState("");
  const [autoDate, setAutoDate] = useState<string | null>(null);
  const [projectSuggestionDismissed, setProjectSuggestionDismissed] =
    useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const add = useInboxStore((s) => s.addInbox),
    createWorkflowProject = useProjectsStore((s) => s.createWorkflowProject),
    projectList = useProjectsStore((s) => s.projects),
    custom = useWorkflowStore((s) => s.custom),
    workflows = allWorkflows(custom),
    workflow = useMemo(
      () => workflows.find((w) => w.id === workflowId),
      [workflows, workflowId],
    ),
    recognizedWorkflow = useMemo(
      () => recognizeWorkflow(text, workflows).workflow,
      [text, workflows],
    ),
    suggestedWorkflow =
      recognizedWorkflow?.id === workflowId ? undefined : recognizedWorkflow;

  const projects = useMemo(
    () => projectList.filter((p) => !p.archived && !p.deletedAt),
    [projectList],
  );

  useEffect(() => {
    const detectedDate = dateFromText(text);
    if (detectedDate && (date === "" || date === autoDate)) {
      setDate(detectedDate);
      setAutoDate(detectedDate);
    } else if (!detectedDate && date === autoDate) {
      setDate("");
      setAutoDate(null);
    }
  }, [text, date, autoDate]);

  useEffect(() => {
    if (!text.trim()) {
      setProjectSuggestionDismissed(false);
      setEditingProjectName(false);
    }
  }, [text]);

  const projectCandidate =
    isProjectCandidate(text) && !projectSuggestionDismissed;

  function save() {
    const title = text.trim();
    if (!title) return;
    if (workflow) {
      if (workflow.needsDate && !date) {
        setMessage("Vyber klíčové datum workflow.");
        return;
      }
      createWorkflowProject(title, workflow, date || null, preparationStartDate || null, repeatType, repeatInterval);
      setMessage(`Hotovo – projekt + ${workflow.steps.length} úkolů.`);
    } else {
      add(title, {
        dueDate: date || null,
        reminderAt: reminderAt || null,
        projectId: projectId || null,
      });
      setMessage("Uloženo do Inboxu.");
    }
    setText("");
    setDate("");
    setReminderAt("");
    setProjectId("");
    setWorkflowId("");
    setPreparationStartDate("");
    setRepeatType("none");
    setRepeatInterval(1);
    setAutoDate(null);
    setEditingProjectName(false);
    setTimeout(() => setMessage(""), 2500);
  }

  function createProjectFromCapture() {
    const title = text.trim();
    if (!title) return;
    if (workflow?.needsDate && !date) {
      setMessage("Vyber klíčové datum workflow.");
      return;
    }

    if (workflow) {
      createWorkflowProject(title, workflow, date || null, preparationStartDate || null, repeatType, repeatInterval);
      setMessage(`Hotovo – projekt + ${workflow.steps.length} úkolů.`);
    } else {
      setMessage("Projekt vytvořen.");
    }
    setText("");
    setDate("");
    setReminderAt("");
    setProjectId("");
    setWorkflowId("");
    setPreparationStartDate("");
    setRepeatType("none");
    setRepeatInterval(1);
    setAutoDate(null);
    setTimeout(() => setMessage(""), 2500);
  }
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm md:rounded-3xl md:p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500">
        <Sparkles size={17} />
        Co máš v hlavě?
      </div>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === "Enter") save();
        }}
        placeholder="Napiš úkol, myšlenku nebo novou akci…"
        rows={2}
        className="mt-3 w-full resize-none border-0 bg-transparent text-lg md:text-xl font-medium outline-none placeholder:text-zinc-300"
      />
      {suggestedWorkflow && (
        <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
            <Brain size={17} />
            Doporučení
          </div>
          <p className="mt-2 text-sm text-violet-800">
            Rozpoznal jsem workflow:
          </p>
          <div className="mt-1 font-medium text-violet-950">
            {suggestedWorkflow.name}
          </div>
          <button
            type="button"
            onClick={() => setWorkflowId(suggestedWorkflow.id)}
            className="mt-3 rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
          >
            Použít
          </button>
        </div>
      )}
      {projectCandidate && (
        <>
          <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-semibold text-amber-950">
              📁 Vypadá to jako projekt.
            </div>
            <p className="mt-2 text-sm text-amber-900">
              Chceš z něj vytvořit projekt?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={createProjectFromCapture}
                className="rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
              >
                Ano
              </button>
              <button
                type="button"
                onClick={() => setProjectSuggestionDismissed(true)}
                className="rounded-xl border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Ne
              </button>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border bg-white p-4">
            <div className="font-semibold">📋 Vznikne:</div>
            {workflow ? (
              <>
                <div className="mt-3 space-y-1.5 text-sm text-zinc-700">
                  {workflow.steps.slice(0, 5).map((step) => (
                    <div key={step.id}>✓ {step.title}</div>
                  ))}
                  {workflow.steps.length > 5 && <div>…</div>}
                </div>
                <p className="mt-3 text-sm font-medium text-zinc-600">
                  Vytvoří se {workflow.steps.length} úkolů.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-zinc-600">
                Bude vytvořen pouze projekt.
              </p>
            )}
            <button
              type="button"
              onClick={() => setEditingProjectName((value) => !value)}
              className="mt-4 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              ✏️ Upravit název projektu
            </button>
            {editingProjectName && (
              <input
                autoFocus
                value={text}
                onChange={(event) => setText(event.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            )}
          </div>
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 sm:flex sm:flex-wrap sm:items-center">
        {!workflow && (
          <label className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-sm sm:px-3">
            <span className="text-zinc-400">📅</span>
            <input type="date" value={date} onChange={(e) => { setAutoDate(null); setDate(e.target.value); }}
              className="min-w-0 flex-1 bg-transparent outline-none" />
          </label>
        )}
        <label className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-sm sm:px-3">
          <Bell size={16} className="shrink-0 text-zinc-400" />
          <input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
        <label className="flex min-w-0 items-center gap-2 rounded-lg border px-2 py-2 text-sm sm:px-3">
          <FolderKanban size={16} className="shrink-0 text-zinc-400" />
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none">
            <option value="">Bez projektu</option>
            {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
          </select>
        </label>
        <select value={workflowId} onChange={(e) => setWorkflowId(e.target.value)}
          className="min-w-0 rounded-lg border px-2 py-2 text-sm sm:px-3">
          <option value="">Bez workflow</option>
          {workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button onClick={save}
          className="col-span-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:ml-auto sm:py-2.5">
          {workflow ? "Rozsekat a uložit" : "Uložit"}
        </button>
      </div>
      {workflow && (
        <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
          <div className="text-sm font-semibold text-blue-950">Nastavení akce</div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-blue-950">
              Datum konání
              <input type="date" value={date} onChange={(e) => { setAutoDate(null); setDate(e.target.value); }} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal text-zinc-900" />
            </label>
            <label className="text-sm font-medium text-blue-950">
              Začátek přípravy
              <input type="date" value={preparationStartDate} onChange={(e) => setPreparationStartDate(e.target.value)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal text-zinc-900" />
            </label>
            <label className="text-sm font-medium text-blue-950">
              Opakovat
              <select value={repeatType} onChange={(e) => setRepeatType(e.target.value as ProjectRepeatType)} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal text-zinc-900">
                <option value="none">Neopakovat</option>
                <option value="daily">Každý den</option>
                <option value="weekly">Každý týden</option>
                <option value="monthly">Každý měsíc</option>
                <option value="yearly">Každý rok</option>
                <option value="interval">Každých X dní</option>
              </select>
            </label>
          </div>
          {repeatType === "interval" && (
            <label className="mt-3 block max-w-[180px] text-sm font-medium text-blue-950">
              Počet dní
              <input type="number" min="1" value={repeatInterval} onChange={(e) => setRepeatInterval(Math.max(1, Number(e.target.value) || 1))} className="mt-1 w-full rounded-lg border bg-white px-3 py-2 font-normal text-zinc-900" />
            </label>
          )}
          <p className="mt-2 text-xs text-blue-800">Úkoly „po začátku přípravy“ se počítají od tohoto data, úkoly „před akcí“ od data konání. Při opakování se obě data posunou stejně.</p>
        </div>
      )}
      {(recognizedWorkflow || autoDate) && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <div className="flex items-center gap-2 font-semibold">
            <Brain size={17} />
            Rozpoznáno:
          </div>
          <ul className="mt-2 space-y-1 text-violet-900">
            {recognizedWorkflow && <li>• Workflow: {recognizedWorkflow.name}</li>}
            {autoDate && <li>• Termín: {displayDate(autoDate)}</li>}
          </ul>
        </div>
      )}
      {workflow && (
        <div className="mt-4 rounded-2xl bg-blue-50 p-4">
          <div className="font-medium text-blue-950">
            {workflow.name} · vytvoří {workflow.steps.length} úkolů
          </div>
          <div className="mt-2 grid gap-1 md:grid-cols-2">
            {workflow.steps.map((s) => (
              <div key={s.id} className="text-xs text-blue-900">
                ✓ {s.title} ·{" "}
{scheduleLabel(s.scheduleType, s.scheduleDays)}
              </div>
            ))}
          </div>
        </div>
      )}
      {message && (
        <div className="mt-3 text-sm font-medium text-green-700">{message}</div>
      )}
      <div className="mt-2 hidden text-right text-xs text-zinc-300 md:block">
        Ctrl + Enter uloží
      </div>
    </div>
  );
}
