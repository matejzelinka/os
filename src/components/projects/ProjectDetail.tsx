import { useState } from "react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore, nextDate } from "@/store/projects";
import type { ProjectRepeatType } from "@/types/project";

const repeatOptions: Array<{ value: ProjectRepeatType; label: string }> = [
  { value: "none", label: "Neopakovat" },
  { value: "daily", label: "Každý den" },
  { value: "weekly", label: "Každý týden" },
  { value: "monthly", label: "Každý měsíc" },
  { value: "yearly", label: "Každý rok" },
  { value: "interval", label: "Každých X dní" },
];

export default function ProjectDetail() {
  const projects = useProjectsStore((s) => s.projects);
  const updateProject = useProjectsStore((s) => s.updateProject);
  const deleteProject = useProjectsStore((s) => s.deleteProject);
  const inbox = useInboxStore((s) => s.inbox);
  const toggle = useInboxStore((s) => s.toggleInbox);
  const update = useInboxStore((s) => s.updateInbox);
  const unassign = useInboxStore((s) => s.assignInboxToProject);

  const id = new URLSearchParams(window.location.search).get("id");
  const project = projects.find((p) => p.id === id);
  const items = inbox.filter((i) => i.projectId === id);

  const [pe, setPe] = useState(false);
  const [pd, setPd] = useState("");
  const [te, setTe] = useState<string | null>(null);
  const [td, setTd] = useState("");
  const [repeatType, setRepeatType] = useState<ProjectRepeatType>(project?.repeatType ?? "none");
  const [repeatInterval, setRepeatInterval] = useState(project?.repeatInterval ?? 1);
  const [eventDate, setEventDate] = useState(project?.eventDate ?? "");
  const [preparationStartDate, setPreparationStartDate] = useState(project?.preparationStartDate ?? "");
  const [nextEventDate, setNextEventDate] = useState(project?.repeatNextDate ?? "");
  const [nextPreparationDate, setNextPreparationDate] = useState(project?.repeatNextPreparationDate ?? "");

  if (!project || !id) return <div className="rounded-2xl border bg-white p-10">Projekt nebyl nalezen.</div>;

  const done = items.filter((i) => i.completed).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  function saveP() {
    if (pd.trim()) updateProject(id, { name: pd.trim() });
    setPe(false);
  }

  function saveT(tid: string) {
    if (td.trim()) update(tid, { title: td.trim() });
    setTe(null);
  }

  function saveRepeat() {
    const type = repeatType;
    const interval = Math.max(1, repeatInterval || 1);
    const currentEvent = eventDate || project.eventDate || project.repeatAnchorDate || project.createdAt.slice(0, 10);
    const currentPreparation = preparationStartDate || project.preparationStartDate || null;
    if (type === "none") {
      updateProject(id, { repeatType: "none", repeatInterval: 1, repeatNextDate: null, repeatNextPreparationDate: null, eventDate: eventDate || null, preparationStartDate: currentPreparation });
      return;
    }
    const first = nextEventDate || nextDate(currentEvent, type, interval);
    const firstPreparation = nextPreparationDate || (currentPreparation ? nextDate(currentPreparation, type, interval) : null);
    updateProject(id, {
      repeatType: type,
      repeatInterval: interval,
      eventDate: eventDate || null,
      preparationStartDate: currentPreparation,
      repeatAnchorDate: currentEvent,
      repeatNextDate: first,
      repeatNextPreparationDate: firstPreparation,
    });
    setRepeatInterval(interval);
    setNextEventDate(first ?? "");
    setNextPreparationDate(firstPreparation ?? "");
  }

  function removeProject() {
    if (!window.confirm(`Smazat projekt „${project.name}“? Úkoly zůstanou v Inboxu.`)) return;
    items.forEach((item) => unassign(item.id, null));
    deleteProject(id);
    window.location.href = "/projects";
  }

  return (
    <div className="space-y-7">
      <a href="/projects" className="text-sm text-zinc-500">← Projekty</a>

      <div className="flex items-center gap-4">
        <input type="color" value={project.color} onChange={(e) => updateProject(id, { color: e.target.value })} className="h-9 w-9 cursor-pointer border-0 bg-transparent" />
        {pe ? (
          <input autoFocus value={pd} onChange={(e) => setPd(e.target.value)} onBlur={saveP} onKeyDown={(e) => e.key === "Enter" && saveP()} className="flex-1 rounded-xl border px-3 py-2 text-3xl font-bold" />
        ) : (
          <button onClick={() => { setPd(project.name); setPe(true); }} className="text-left text-3xl font-bold hover:text-blue-700">{project.name}</button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-zinc-500">Kliknutím na název projektu nebo úkolu ho rovnou přejmenuješ.</p>
        <button onClick={removeProject} className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Smazat projekt</button>
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-2 flex justify-between text-sm"><span>Průběh</span><span>{progress} %</span></div>
        <div className="h-2 rounded-full bg-zinc-100"><div className="h-2 rounded-full" style={{ width: `${progress}%`, backgroundColor: project.color }} /></div>
      </div>

      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-xl font-semibold">Opakování projektu</h2>
        <p className="mt-1 text-sm text-zinc-500">U opakující se akce se znovu spustí workflow. Datum konání a začátek přípravy jsou samostatné referenční body.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">Datum konání<input type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); updateProject(id, { eventDate: e.target.value || null }); }} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          <label className="text-sm font-medium">Začátek přípravy<input type="date" value={preparationStartDate} onChange={(e) => { setPreparationStartDate(e.target.value); updateProject(id, { preparationStartDate: e.target.value || null }); }} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select value={repeatType} onChange={(e) => setRepeatType(e.target.value as ProjectRepeatType)} className="rounded-xl border px-3 py-2 text-sm">
            {repeatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {repeatType === "interval" && (
            <input type="number" min={1} value={repeatInterval} onChange={(e) => setRepeatInterval(Math.max(1, Number(e.target.value) || 1))} className="w-24 rounded-xl border px-3 py-2 text-sm" />
          )}
          {repeatType !== "none" && (
            <div className="flex flex-wrap gap-3 text-sm">
              <label>Další datum akce<input type="date" value={nextEventDate} onChange={(e) => setNextEventDate(e.target.value)} className="ml-2 rounded-xl border px-2 py-2" /></label>
              <label>Další začátek přípravy<input type="date" value={nextPreparationDate} onChange={(e) => setNextPreparationDate(e.target.value)} className="ml-2 rounded-xl border px-2 py-2" /></label>
            </div>
          )}
          <button onClick={saveRepeat} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Uložit opakování</button>
        </div>
        {project.repeatType && project.repeatType !== "none" && project.repeatNextDate && (
          <p className="mt-3 text-sm text-zinc-500">Další opakování: <strong>{project.repeatNextDate}</strong></p>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Úkoly</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-xl border bg-white p-4">
              <input type="checkbox" checked={item.completed} onChange={() => toggle(item.id)} />
              <div className="flex-1">
                {te === item.id ? (
                  <input autoFocus value={td} onChange={(e) => setTd(e.target.value)} onBlur={() => saveT(item.id)} onKeyDown={(e) => e.key === "Enter" && saveT(item.id)} className="w-full rounded-lg border px-3 py-2" />
                ) : (
                  <button onClick={() => { setTe(item.id); setTd(item.title); }} className={`text-left font-medium hover:text-blue-700 ${item.completed ? "line-through text-zinc-400" : ""}`}>{item.title}</button>
                )}
                <div className="mt-1 text-xs text-zinc-400">{item.dueDate && `Termín ${item.dueDate}`}</div>
              </div>
              <button onClick={() => unassign(item.id, null)} className="text-sm text-zinc-500">Do Inboxu</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
