import { useMemo, useState } from "react";
import { dateBefore } from "@/lib/workflows";
import { useWorkflowStore, allWorkflows } from "@/store/workflows";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import type { TaskPriority } from "@/types/inbox";
export default function WorkflowCreator() {
  const custom = useWorkflowStore((s) => s.custom),
    addTemplate = useWorkflowStore((s) => s.add),
    updateTemplate = useWorkflowStore((s) => s.update),
    removeTemplate = useWorkflowStore((s) => s.remove);
  const templates = allWorkflows(custom);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [stepTitle, setStepTitle] = useState("");
  const [days, setDays] = useState(14);
  const [priority, setPriority] = useState<TaskPriority>("normal");
  const template = useMemo(
    () => templates.find((t) => t.id === templateId),
    [templates, templateId],
  );
  const addMany = useInboxStore((s) => s.addManyInbox);
  const createProject = useProjectsStore((s) => s.createProject);
  function create() {
    if (!template || !name.trim() || (template.needsDate && !date)) return;
    const projectId = createProject(name.trim());
    addMany(
      template.steps.map((step) => ({
        title: step.title,
        options: {
          projectId,
          priority: step.priority,
          dueDate: date ? dateBefore(date, step.daysBefore) : null,
        },
      })),
    );
    setCreated(projectId);
    setName("");
    setDate("");
  }
  function createTemplate() {
    if (!newName.trim()) return;
    const id = addTemplate(newName.trim(), "Vlastní workflow");
    setNewName("");
    setEditId(id);
    setTemplateId(id);
  }
  function addStep() {
    const t = custom.find((x) => x.id === editId);
    if (!t || !stepTitle.trim()) return;
    updateTemplate(t.id, {
      steps: [
        ...t.steps,
        {
          id: crypto.randomUUID(),
          title: stepTitle.trim(),
          daysBefore: days,
          priority,
        },
      ],
    });
    setStepTitle("");
  }
  const editing = custom.find((x) => x.id === editId);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Workflow</h1>
        <p className="mt-2 text-zinc-500">
          Opakující se práci rozlož jedním zadáním na celý projekt.
        </p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Spustit workflow</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium">
              Šablona
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Název projektu
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Např. Koncert 14. 11."
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </label>
            <label className="text-sm font-medium">
              Klíčové datum
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full rounded-xl border px-4 py-3"
              />
            </label>
          </div>
          {template && (
            <div className="mt-5 rounded-xl bg-zinc-50 p-4">
              <div className="font-medium">{template.steps.length} kroků</div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {template.steps.map((s) => (
                  <div key={s.id} className="text-sm text-zinc-600">
                    ✓ {s.title} · {s.daysBefore} dní před
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={create}
            disabled={!name.trim() || Boolean(template?.needsDate && !date)}
            className="mt-5 rounded-xl bg-blue-600 px-5 py-3 font-medium text-white disabled:opacity-40"
          >
            Vytvořit projekt a úkoly
          </button>
          {created && (
            <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              Hotovo.{" "}
              <a
                className="font-semibold underline"
                href={`/project?id=${created}`}
              >
                Otevřít projekt →
              </a>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Vlastní šablony</h2>
          <div className="mt-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createTemplate()}
              placeholder="Název workflow"
              className="min-w-0 flex-1 rounded-xl border px-3 py-2"
            />
            <button
              onClick={createTemplate}
              className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
            >
              Přidat
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {custom.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 p-3"
              >
                <button
                  onClick={() => setEditId(t.id)}
                  className="text-left text-sm font-medium"
                >
                  {t.name}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {t.steps.length} kroků
                  </span>
                </button>
                <button
                  onClick={() => removeTemplate(t.id)}
                  className="text-xs text-red-500"
                >
                  Smazat
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {editing && (
        <div className="rounded-2xl border bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Upravit: {editing.name}</h2>
            <button
              onClick={() => setEditId(null)}
              className="text-sm text-zinc-500"
            >
              Zavřít
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_170px_auto]">
            <input
              value={stepTitle}
              onChange={(e) => setStepTitle(e.target.value)}
              placeholder="Nový krok"
              className="rounded-xl border px-3 py-2"
            />
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border px-3 py-2"
              title="Dní před"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="rounded-xl border px-3 py-2"
            >
              <option value="low">Nízká</option>
              <option value="normal">Normální</option>
              <option value="high">Vysoká</option>
            </select>
            <button
              onClick={addStep}
              className="rounded-xl bg-blue-600 px-4 py-2 text-white"
            >
              Přidat krok
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {editing.steps.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 text-sm"
              >
                <span>
                  {i + 1}. {s.title} · {s.daysBefore} dní před · {s.priority}
                </span>
                <button
                  onClick={() =>
                    updateTemplate(editing.id, {
                      steps: editing.steps.filter((x) => x.id !== s.id),
                    })
                  }
                  className="text-red-500"
                >
                  Odebrat
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
