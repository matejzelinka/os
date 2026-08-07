import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import csLocale from "@fullcalendar/core/locales/cs";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { taskIdFromUrl } from "@/lib/taskLinks";
import "@fullcalendar/common/main.css";

export default function CalendarPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const inbox = useInboxStore((s) => s.inbox);
  const addInbox = useInboxStore((s) => s.addInbox);
  const setDueDate = useInboxStore((s) => s.setDueDate);
  const projects = useProjectsStore((s) => s.projects);

  useEffect(() => {
    const taskId = taskIdFromUrl();
    if (taskId) setSelected(taskId);
  }, []);

  const events = useMemo(
    () =>
      inbox
        .filter((item) => !item.completed && !item.deletedAt && item.dueDate)
        .map((item) => {
          const project = projects.find((p) => p.id === item.projectId);
          const color = project?.color ?? "#94a3b8";
          return {
            id: item.id,
            title: item.title || "Bez názvu",
            start: item.dueDate,
            allDay: true,
            backgroundColor: color,
            borderColor: color,
            textColor: "#ffffff"
          };
        }),
    [inbox, projects]
  );

  function openTask(taskId: string) {
    setSelected(taskId);
    const url = new URL(window.location.href);
    url.searchParams.set("task", taskId);
    history.replaceState({}, "", url.toString());
  }

  function closeTask() {
    setSelected(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("task");
    history.replaceState({}, "", url.pathname + url.search);
  }

  function handleDateClick(clickInfo: { dateStr: string }) {
    const id = addInbox("Nový úkol", { dueDate: clickInfo.dateStr });
    if (typeof id !== "string") return;
    openTask(id);
  }

  function handleEventClick(clickInfo: any) {
    clickInfo.jsEvent.preventDefault();
    openTask(clickInfo.event.id);
  }

  function handleEventDrop(dropInfo: any) {
    if (!dropInfo.event?.id || !dropInfo.event?.startStr) return;
    setDueDate(dropInfo.event.id, dropInfo.event.startStr);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Kalendář</h1>
        <p className="mt-2 text-zinc-500">Plánuj úkoly v měsíčním nebo týdenním přehledu. Přetáhni úkol pro změnu termínu nebo klepni na den pro vytvoření nového úkolu.</p>
      </div>

      <div className="overflow-hidden rounded-3xl border bg-white p-5 shadow-sm">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locales={[csLocale]}
          locale="cs"
          headerToolbar={{ left: "title", center: "", right: "dayGridMonth,timeGridWeek" }}
          buttonText={{ month: "Měsíc", week: "Týden" }}
          events={events}
          editable={true}
          selectable={true}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          eventDrop={handleEventDrop}
          eventDurationEditable={false}
          dayMaxEvents={true}
          height="auto"
        />
      </div>

      <TaskDrawer taskId={selected} onClose={closeTask} />
    </div>
  );
}
