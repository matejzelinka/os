import { useEffect, useState } from "react";
import CaptureBox from "@/components/capture/CaptureBox";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskListItem from "@/components/tasks/TaskListItem";
import { useInboxStore } from "@/store/inbox";
import { taskIdFromUrl } from "@/lib/taskLinks";

export default function InboxInput() {
  const [selected, setSelected] = useState<string | null>(null);
  const inbox = useInboxStore((s) => s.inbox),
    toggle = useInboxStore((s) => s.toggleInbox);

  useEffect(() => {
    setSelected(taskIdFromUrl());
  }, []);

  function openTask(id: string) {
    setSelected(id);
    const url = new URL(window.location.href);
    url.searchParams.set("task", id);
    history.replaceState({}, "", url);
  }
  function closeTask() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    history.replaceState({}, "", url.pathname + url.search);
  }

  return (
    <div className="space-y-6">
      <CaptureBox />
      {inbox.filter((item) => !item.deletedAt).length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center text-zinc-500">
          Inbox je prázdný.
        </div>
      )}
      <div className="space-y-3">
        {inbox
          .filter((item) => !item.deletedAt)
          .map((item) => (
            <TaskListItem
              key={item.id}
              item={item}
              onToggle={() => toggle(item.id)}
              onOpen={() => openTask(item.id)}
            />
          ))}
      </div>
      <TaskDrawer taskId={selected} onClose={closeTask} />
    </div>
  );
}
