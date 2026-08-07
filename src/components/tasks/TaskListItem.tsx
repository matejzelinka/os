import { useProjectsStore } from "@/store/projects";
import type { InboxItem } from "@/types/inbox";

export default function TaskListItem({
  item,
  onToggle,
  onOpen,
  today,
}: {
  item: InboxItem;
  onToggle: () => void;
  onOpen: () => void;
  today?: string;
}) {
  const project = useProjectsStore((s) =>
    s.projects.find((p) => p.id === item.projectId),
  );
  const late = Boolean(today && item.dueDate && item.dueDate < today);
  const doneSteps = (item.subtasks ?? []).filter((s) => s.completed).length;
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm">
      <input
        type="checkbox"
        checked={item.completed}
        onChange={onToggle}
        className="mt-1 h-4 w-4"
      />
      <button onClick={onOpen} className="min-w-0 flex-1 text-left">
        <div
          className={`font-medium ${item.completed ? "line-through text-zinc-400" : ""}`}
        >
          {item.title}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-400">
          <span
            className={project ? "font-medium text-blue-600" : "text-zinc-400"}
          >
            {project?.name ?? "Bez projektu"}
          </span>
          {item.dueDate && (
            <span className={late ? "font-medium text-red-600" : ""}>
              {late ? `Po termínu · ${item.dueDate}` : `${item.dueDate}`}
            </span>
          )}
          {item.priority === "high" && (
            <span className="font-medium text-orange-600">Vysoká priorita</span>
          )}
          {(item.subtasks ?? []).length > 0 && (
            <span>
              {doneSteps}/{item.subtasks!.length} kroků
            </span>
          )}
          {item.note && <span>Má poznámku</span>}
        </div>
      </button>
    </div>
  );
}
