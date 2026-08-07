import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Flag,
  FolderKanban,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import type { TaskPriority } from "@/types/inbox";
import TaskAttachments from "./TaskAttachments";

export default function TaskDrawer({
  taskId,
  onClose,
}: {
  taskId: string | null;
  onClose: () => void;
}) {
  const task = useInboxStore((s) => s.inbox.find((i) => i.id === taskId));
  const update = useInboxStore((s) => s.updateInbox);
  const toggle = useInboxStore((s) => s.toggleInbox);
  const remove = useInboxStore((s) => s.deleteInbox);
  const addSubtask = useInboxStore((s) => s.addSubtask);
  const toggleSubtask = useInboxStore((s) => s.toggleSubtask);
  const deleteSubtask = useInboxStore((s) => s.deleteSubtask);
  const projects = useProjectsStore((s) => s.projects).filter(
    (p) => !p.archived,
  );
  const [subtask, setSubtask] = useState("");

  useEffect(() => {
    if (!taskId) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [taskId, onClose]);

  if (!task) return null;
  const project = projects.find((p) => p.id === task.projectId);
  function addStep() {
    const t = subtask.trim();
    if (!t) return;
    addSubtask(task.id, t);
    setSubtask("");
  }

  return (
    <div className="fixed inset-0 z-[100]">
      <button
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-label="Zavřít detail"
      />
      <aside className="absolute inset-x-0 bottom-0 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border-t bg-zinc-50 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:max-w-[460px] md:rounded-none md:border-l md:border-t-0">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <div className="text-sm font-semibold text-zinc-500">
            Detail úkolu
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-100"
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-4 p-4 pb-8 md:p-5">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggle(task.id)}
                className="mt-1 text-zinc-400 hover:text-blue-600"
              >
                <CheckCircle2
                  size={22}
                  className={task.completed ? "text-blue-600" : ""}
                />
              </button>
              <textarea
                value={task.title}
                onChange={(e) => update(task.id, { title: e.target.value })}
                rows={2}
                className={`w-full resize-none border-0 text-lg font-semibold outline-none ${task.completed ? "line-through text-zinc-400" : ""}`}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-3 text-sm font-semibold">Dílčí kroky</div>
            <div className="space-y-2">
              {(task.subtasks ?? []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={() => toggleSubtask(task.id, s.id)}
                  />
                  <span
                    className={`flex-1 text-sm ${s.completed ? "line-through text-zinc-400" : ""}`}
                  >
                    {s.title}
                  </span>
                  <button
                    onClick={() => deleteSubtask(task.id, s.id)}
                    className="text-zinc-300 hover:text-red-500"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={subtask}
                onChange={(e) => setSubtask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addStep()}
                placeholder="Přidat dílčí krok…"
                className="min-w-0 flex-1 rounded-xl border bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                onClick={addStep}
                className="rounded-xl border px-3 hover:bg-zinc-50"
              >
                <Plus size={17} />
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border bg-white">
            <label className="flex items-center gap-3 border-b px-4 py-3">
              <FolderKanban size={18} className="text-zinc-400" />
              <span className="w-20 text-sm text-zinc-500">Projekt</span>
              <select
                value={task.projectId ?? ""}
                onChange={(e) =>
                  update(task.id, { projectId: e.target.value || null })
                }
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
              >
                <option value="">Bez projektu</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-3 border-b px-4 py-3">
              <CalendarDays size={18} className="text-zinc-400" />
              <span className="w-20 text-sm text-zinc-500">Termín</span>
              <input
                type="date"
                value={task.dueDate ?? ""}
                onChange={(e) =>
                  update(task.id, { dueDate: e.target.value || null })
                }
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-3 border-b px-4 py-3">
              <Bell size={18} className="text-zinc-400" />
              <span className="w-20 text-sm text-zinc-500">Připomenout</span>
              <input
                type="datetime-local"
                value={task.reminderAt ?? ""}
                onChange={(e) =>
                  update(task.id, { reminderAt: e.target.value || null })
                }
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            <label className="flex items-center gap-3 px-4 py-3">
              <Flag size={18} className="text-zinc-400" />
              <span className="w-20 text-sm text-zinc-500">Priorita</span>
              <select
                value={task.priority}
                onChange={(e) =>
                  update(task.id, { priority: e.target.value as TaskPriority })
                }
                className="flex-1 bg-transparent text-sm outline-none"
              >
                <option value="low">Nízká</option>
                <option value="normal">Normální</option>
                <option value="high">Vysoká</option>
              </select>
            </label>
          </div>

          <TaskAttachments taskId={task.id} />

          <div className="rounded-2xl border bg-white p-4">
            <div className="mb-2 text-sm font-semibold">Poznámka</div>
            <textarea
              value={task.note ?? ""}
              onChange={(e) => update(task.id, { note: e.target.value })}
              rows={7}
              placeholder="Doplň kontext, telefon, odkazy, podklady, co je potřeba zjistit…"
              className="w-full resize-y rounded-xl border-0 bg-zinc-50 p-3 text-sm leading-6 outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-between px-1 pb-6 text-xs text-zinc-400">
            <span>{project ? `Projekt: ${project.name}` : "Bez projektu"}</span>
            <button
              onClick={() => {
                if (confirm("Přesunout tento úkol do koše?")) {
                  remove(task.id);
                  onClose();
                }
              }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={15} />
              Přesunout do koše
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
