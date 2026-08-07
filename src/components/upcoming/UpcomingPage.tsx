import { useState } from "react";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskListItem from "@/components/tasks/TaskListItem";
import { useInboxStore } from "@/store/inbox";
function day(s: string) {
  return new Date(`${s}T12:00:00`).toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
export default function UpcomingPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const inbox = useInboxStore((s) => s.inbox),
    toggle = useInboxStore((s) => s.toggleInbox);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const groups = new Map<string, typeof inbox>();
  inbox
    .filter(
      (i) =>
        !i.completed &&
        !i.deletedAt &&
        i.dueDate &&
        new Date(`${i.dueDate}T12:00:00`) >= today,
    )
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))
    .forEach((i) => {
      const k = i.dueDate!;
      groups.set(k, [...(groups.get(k) || []), i]);
    });
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Nadcházející</h1>
        <p className="mt-2 text-zinc-500">Co tě čeká v dalších dnech.</p>
      </div>
      {groups.size === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-zinc-500">
          Žádné naplánované úkoly.
        </div>
      ) : (
        [...groups].map(([date, items]) => (
          <section key={date}>
            <h2 className="mb-3 capitalize font-semibold">
              {day(date)}{" "}
              <span className="text-sm font-normal text-zinc-400">
                · {items.length}
              </span>
            </h2>
            <div className="space-y-2">
              {items.map((i) => (
                <TaskListItem
                  key={i.id}
                  item={i}
                  onToggle={() => toggle(i.id)}
                  onOpen={() => setSelected(i.id)}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <TaskDrawer taskId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
