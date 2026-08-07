import { useState } from "react";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskListItem from "@/components/tasks/TaskListItem";
import { useInboxStore } from "@/store/inbox";

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const inbox = useInboxStore((s) => s.inbox),
    toggle = useInboxStore((s) => s.toggleInbox),
    today = localDate();
  const tasks = inbox
    .filter(
      (i) => !i.completed && !i.deletedAt && i.dueDate && i.dueDate <= today,
    )
    .sort(
      (a, b) =>
        (a.dueDate ?? "").localeCompare(b.dueDate ?? "") ||
        (a.priority === "high" ? -1 : 1),
    );
  const overdue = tasks.filter((i) => i.dueDate! < today).length;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dnes</h1>
        <p className="mt-2 text-zinc-500">
          {overdue ? `${overdue} úkolů je po termínu. ` : ""}Tady je to, co teď
          potřebuje pozornost.
        </p>
      </div>
      {tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-zinc-500">
          Na dnešek nic nehoří.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((i) => (
            <TaskListItem
              key={i.id}
              item={i}
              today={today}
              onToggle={() => toggle(i.id)}
              onOpen={() => setSelected(i.id)}
            />
          ))}
        </div>
      )}
      <TaskDrawer taskId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
