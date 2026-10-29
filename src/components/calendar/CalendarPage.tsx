import { useEffect, useMemo, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import csLocale from "@fullcalendar/core/locales/cs";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { taskIdFromUrl } from "@/lib/taskLinks";

export default function CalendarPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const calendarApi = useRef<any>(null);
  const [calendarTitle, setCalendarTitle] = useState("");
  const [viewRange, setViewRange] = useState(() => {
    const now = new Date();
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    };
  });
  const inbox = useInboxStore((s) => s.inbox);
  const addInbox = useInboxStore((s) => s.addInbox);
  const setDueDate = useInboxStore((s) => s.setDueDate);
  const projects = useProjectsStore((s) => s.projects);

  useEffect(() => {
    const taskId = taskIdFromUrl();
    if (taskId) setSelected(taskId);
  }, []);

  const events = useMemo(() => {
    const start = new Date(viewRange.start);
    const end = new Date(viewRange.end);

    function parseDate(value: string) {
      return new Date(`${value}T12:00:00`);
    }

    function formatDate(date: Date) {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function addMonthsClamped(date: Date, months: number) {
      const result = new Date(date);
      const originalDay = result.getDate();

      result.setDate(1);
      result.setMonth(result.getMonth() + months);

      const lastDay = new Date(
        result.getFullYear(),
        result.getMonth() + 1,
        0,
      ).getDate();

      result.setDate(Math.min(originalDay, lastDay));
      return result;
    }

    function nextRecurrenceDate(
      date: Date,
      repeatType: typeof inbox[number]["repeatType"],
      repeatInterval = 1,
    ) {
      const next = new Date(date);

      switch (repeatType) {
        case "daily":
          next.setDate(next.getDate() + 1);
          return next;
        case "weekly":
          next.setDate(next.getDate() + 7);
          return next;
        case "monthly":
          return addMonthsClamped(next, 1);
        case "yearly":
          return addMonthsClamped(next, 12);
        case "interval":
          next.setDate(
            next.getDate() +
              (repeatInterval > 0 ? repeatInterval : 1),
          );
          return next;
        default:
          return null;
      }
    }

    function buildEventsForTask(item: (typeof inbox)[number]) {
      if (
        item.completed ||
        item.deletedAt ||
        !item.dueDate
      ) {
        return [];
      }

      const project = projects.find(
        (p) => p.id === item.projectId,
      );
      const color = project?.color ?? "#94a3b8";

      const baseDate = parseDate(item.dueDate);
      const recurring =
        item.repeatType && item.repeatType !== "none";

      const result: Array<Record<string, unknown>> = [];

      // Běžný úkol nebo skutečný aktuální výskyt.
      if (baseDate >= start && baseDate < end) {
        result.push({
          id: item.id,
          title: item.title || "Bez názvu",
          start: item.dueDate,
          allDay: true,
          backgroundColor: color,
          borderColor: color,
          textColor: "#ffffff",
          editable: true,
          extendedProps: {
            taskId: item.id,
            virtual: false,
          },
        });
      }

      if (!recurring) return result;

      // Budoucí výskyty opakovaného úkolu se pouze vizualizují.
      // Nevytváříme kvůli nim skutečné úkoly v Inboxu.
      let occurrence = baseDate;

      // Posuň se rychle na první možný výskyt v aktuálním období.
      while (occurrence < start) {
        const next = nextRecurrenceDate(
          occurrence,
          item.repeatType,
          item.repeatInterval,
        );

        if (!next || next <= occurrence) break;
        occurrence = next;
      }

      while (occurrence < end) {
        if (occurrence >= start) {
          const occurrenceDate = formatDate(occurrence);

          // Skutečný výskyt už jsme přidali výše.
          if (occurrenceDate !== item.dueDate) {
            result.push({
              id: `${item.id}__${occurrenceDate}`,
              title: item.title || "Bez názvu",
              start: occurrenceDate,
              allDay: true,
              backgroundColor: color,
              borderColor: color,
              textColor: "#ffffff",
              editable: false,
              extendedProps: {
                taskId: item.id,
                virtual: true,
              },
            });
          }
        }

        const next = nextRecurrenceDate(
          occurrence,
          item.repeatType,
          item.repeatInterval,
        );

        if (!next || next <= occurrence) break;
        occurrence = next;
      }

      return result;
    }

    return inbox.flatMap(buildEventsForTask);
  }, [inbox, projects, viewRange]);


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
    const taskId =
      clickInfo.event.extendedProps?.taskId ??
      clickInfo.event.id;
    openTask(taskId);
  }

  function handleEventDrop(dropInfo: any) {
    if (dropInfo.event.extendedProps?.virtual) {
      dropInfo.revert();
      return;
    }

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
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => calendarApi.current?.prev()}
              aria-label="Předchozí období"
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-zinc-900 text-xl text-white transition hover:bg-zinc-700 disabled:opacity-40"
              disabled={!calendarApi.current}
            >
              ‹
            </button>

            <div className="min-w-[170px] text-center text-2xl font-medium">
              {calendarTitle}
            </div>

            <button
              type="button"
              onClick={() => calendarApi.current?.next()}
              aria-label="Další období"
              className="flex h-10 w-10 items-center justify-center rounded-lg border bg-zinc-900 text-xl text-white transition hover:bg-zinc-700 disabled:opacity-40"
              disabled={!calendarApi.current}
            >
              ›
            </button>
          </div>

          <div className="flex overflow-hidden rounded-lg border bg-zinc-900">
            <button
              type="button"
              onClick={() => calendarApi.current?.changeView("dayGridMonth")}
              className="px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Měsíc
            </button>
            <button
              type="button"
              onClick={() => calendarApi.current?.changeView("timeGridWeek")}
              className="border-l border-zinc-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Týden
            </button>
          </div>
        </div>

        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          ref={(calendar) => {
            calendarApi.current = calendar?.getApi?.() ?? null;
          }}
          datesSet={(dateInfo) => {
            setCalendarTitle(dateInfo.view.title);

            const nextStart = new Date(dateInfo.start);
            const nextEnd = new Date(dateInfo.end);

            setViewRange((current) => {
              if (
                current.start.getTime() === nextStart.getTime() &&
                current.end.getTime() === nextEnd.getTime()
              ) {
                return current;
              }

              return {
                start: nextStart,
                end: nextEnd,
              };
            });
          }}
          initialView="dayGridMonth"
          locales={[csLocale]}
          locale="cs"
          headerToolbar={{ left: "", center: "", right: "" }}
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
