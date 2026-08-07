import { useEffect, useMemo, useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { useWorkflowStore, allWorkflows } from "@/store/workflows";
import { dateBefore } from "@/lib/workflows";
import { recognizeWorkflow } from "@/lib/planner";
import type { TaskPriority } from "@/types/inbox";

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

function priorityFromText(text: string): TaskPriority | null {
  const input = text.toLocaleLowerCase("cs");
  if (/urgentn\u011b|\basap\b|ihned|co\s+nejd\u0159\u00edve/.test(input)) return "high";
  if (/n\u011bkdy|a\u017e\s+bude\s+\u010das/.test(input)) return "low";
  return null;
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

export default function CaptureBox() {
  const [text, setText] = useState(""),
    [date, setDate] = useState(""),
    [priority, setPriority] = useState<TaskPriority>("normal"),
    [workflowId, setWorkflowId] = useState(""),
    [message, setMessage] = useState("");
  const [autoDate, setAutoDate] = useState<string | null>(null);
  const [autoPriority, setAutoPriority] = useState<TaskPriority | null>(null);
  const [projectSuggestionDismissed, setProjectSuggestionDismissed] =
    useState(false);
  const [editingProjectName, setEditingProjectName] = useState(false);
  const add = useInboxStore((s) => s.addInbox),
    addMany = useInboxStore((s) => s.addManyInbox),
    createProject = useProjectsStore((s) => s.createProject),
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

  useEffect(() => {
    const detectedDate = dateFromText(text);
    if (detectedDate && (date === "" || date === autoDate)) {
      setDate(detectedDate);
      setAutoDate(detectedDate);
    } else if (!detectedDate && date === autoDate) {
      setDate("");
      setAutoDate(null);
    }

    const detectedPriority = priorityFromText(text);
    if (detectedPriority && (priority === "normal" || priority === autoPriority)) {
      setPriority(detectedPriority);
      setAutoPriority(detectedPriority);
    } else if (!detectedPriority && priority === autoPriority) {
      setPriority("normal");
      setAutoPriority(null);
    }
  }, [text, date, priority, autoDate, autoPriority]);

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
      const projectId = createProject(title);
      addMany(
        workflow.steps.map((step) => ({
          title: step.title,
          options: {
            projectId,
            priority: step.priority,
            dueDate: date ? dateBefore(date, step.daysBefore) : null,
          },
        })),
      );
      setMessage(`Hotovo – projekt + ${workflow.steps.length} úkolů.`);
    } else {
      add(title, { dueDate: date || null, priority });
      setMessage("Uloženo do Inboxu.");
    }
    setText("");
    setDate("");
    setPriority("normal");
    setWorkflowId("");
    setAutoDate(null);
    setAutoPriority(null);
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

    const projectId = createProject(title);
    if (workflow) {
      addMany(
        workflow.steps.map((step) => ({
          title: step.title,
          options: {
            projectId,
            priority: step.priority,
            dueDate: date ? dateBefore(date, step.daysBefore) : null,
          },
        })),
      );
      setMessage(`Hotovo – projekt + ${workflow.steps.length} úkolů.`);
    } else {
      setMessage("Projekt vytvořen.");
    }
    setText("");
    setDate("");
    setPriority("normal");
    setWorkflowId("");
    setAutoDate(null);
    setAutoPriority(null);
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
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setAutoDate(null);
            setDate(e.target.value);
          }}
          className="min-w-0 rounded-lg border px-2 py-2 text-sm sm:px-3"
        />
        <select
          value={workflowId}
          onChange={(e) => setWorkflowId(e.target.value)}
          className="min-w-0 rounded-lg border px-2 py-2 text-sm sm:px-3"
        >
          <option value="">Bez workflow</option>
          {workflows.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        {!workflow && (
          <select
            value={priority}
            onChange={(e) => {
              setAutoPriority(null);
              setPriority(e.target.value as TaskPriority);
            }}
            className="min-w-0 rounded-lg border px-2 py-2 text-sm sm:px-3"
          >
            <option value="low">Nízká priorita</option>
            <option value="normal">Normální priorita</option>
            <option value="high">Vysoká priorita</option>
          </select>
        )}
        <button
          onClick={save}
          className="col-span-2 rounded-xl bg-blue-600 px-5 py-3 sm:ml-auto sm:py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {workflow ? "Rozsekat a uložit" : "Uložit"}
        </button>
      </div>
      {(recognizedWorkflow || autoDate || autoPriority) && (
        <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
          <div className="flex items-center gap-2 font-semibold">
            <Brain size={17} />
            Rozpoznáno:
          </div>
          <ul className="mt-2 space-y-1 text-violet-900">
            {recognizedWorkflow && <li>• Workflow: {recognizedWorkflow.name}</li>}
            {autoDate && <li>• Termín: {displayDate(autoDate)}</li>}
            {autoPriority && (
              <li>
                • Priorita: {autoPriority === "high" ? "vysoká" : "nízká"}
              </li>
            )}
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
                ✓ {s.title} · {s.daysBefore} dní před
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
