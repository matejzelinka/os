import { useState } from "react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
export default function ProjectDetail() {
  const projects = useProjectsStore((s) => s.projects),
    updateProject = useProjectsStore((s) => s.updateProject),
    inbox = useInboxStore((s) => s.inbox),
    toggle = useInboxStore((s) => s.toggleInbox),
    update = useInboxStore((s) => s.updateInbox),
    unassign = useInboxStore((s) => s.assignInboxToProject);
  const id = new URLSearchParams(window.location.search).get("id"),
    project = projects.find((p) => p.id === id),
    items = inbox.filter((i) => i.projectId === id && !i.deletedAt);
  const [pe, setPe] = useState(false),
    [pd, setPd] = useState(""),
    [te, setTe] = useState<string | null>(null),
    [td, setTd] = useState("");
  if (!project || !id)
    return (
      <div className="rounded-2xl border bg-white p-10">
        Projekt nebyl nalezen.
      </div>
    );
  const done = items.filter((i) => i.completed).length,
    progress = items.length ? Math.round((done / items.length) * 100) : 0;
  function saveP() {
    if (pd.trim()) updateProject(id, { name: pd.trim() });
    setPe(false);
  }
  function saveT(tid: string) {
    if (td.trim()) update(tid, { title: td.trim() });
    setTe(null);
  }
  return (
    <div className="space-y-7">
      <a href="/projects" className="text-sm text-zinc-500">
        ← Projekty
      </a>
      <div className="flex items-center gap-4">
        <input
          type="color"
          value={project.color}
          onChange={(e) => updateProject(id, { color: e.target.value })}
          className="h-9 w-9 cursor-pointer border-0 bg-transparent"
        />
        {pe ? (
          <input
            autoFocus
            value={pd}
            onChange={(e) => setPd(e.target.value)}
            onBlur={saveP}
            onKeyDown={(e) => e.key === "Enter" && saveP()}
            className="flex-1 rounded-xl border px-3 py-2 text-3xl font-bold"
          />
        ) : (
          <button
            onClick={() => {
              setPd(project.name);
              setPe(true);
            }}
            className="text-left text-3xl font-bold hover:text-blue-700"
          >
            {project.name}
          </button>
        )}
      </div>
      <p className="text-zinc-500">
        Kliknutím na název projektu nebo úkolu ho rovnou přejmenuješ.
      </p>
      <div className="rounded-2xl border bg-white p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span>Průběh</span>
          <span>{progress} %</span>
        </div>
        <div className="h-2 rounded-full bg-zinc-100">
          <div
            className="h-2 rounded-full"
            style={{ width: `${progress}%`, backgroundColor: project.color }}
          />
        </div>
      </div>
      <section>
        <h2 className="mb-4 text-xl font-semibold">Úkoly</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 rounded-xl border bg-white p-4"
            >
              <input
                type="checkbox"
                checked={item.completed}
                onChange={() => toggle(item.id)}
              />
              <div className="flex-1">
                {te === item.id ? (
                  <input
                    autoFocus
                    value={td}
                    onChange={(e) => setTd(e.target.value)}
                    onBlur={() => saveT(item.id)}
                    onKeyDown={(e) => e.key === "Enter" && saveT(item.id)}
                    className="w-full rounded-lg border px-3 py-2"
                  />
                ) : (
                  <button
                    onClick={() => {
                      setTe(item.id);
                      setTd(item.title);
                    }}
                    className={`text-left font-medium hover:text-blue-700 ${item.completed ? "line-through text-zinc-400" : ""}`}
                  >
                    {item.title}
                  </button>
                )}
                <div className="mt-1 text-xs text-zinc-400">
                  {item.dueDate && `Termín ${item.dueDate}`}
                </div>
              </div>
              <button
                onClick={() => unassign(item.id, null)}
                className="text-sm text-zinc-500"
              >
                Do Inboxu
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
