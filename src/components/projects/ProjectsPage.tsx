import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useProjectsStore } from "@/store/projects";
import { useInboxStore } from "@/store/inbox";

export default function ProjectsPage() {
  const [name, setName] = useState("");

  const projects = useProjectsStore((state) => state.projects);
  const addProject = useProjectsStore((state) => state.addProject);
  const inbox = useInboxStore((state) => state.inbox);

  function createProject() {
    const value = name.trim();

    if (!value) return;

    addProject(value);
    setName("");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Projekty</h1>

        <p className="mt-2 text-zinc-500">Organizuj práci do projektů.</p>
      </div>

      <div className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              createProject();
            }
          }}
          placeholder="Název projektu..."
          className="flex-1 rounded-xl border border-zinc-300 bg-white px-5 py-3 outline-none focus:border-blue-500"
        />

        <Button onClick={createProject}>Nový projekt</Button>
      </div>

      {projects.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white p-10 text-center text-zinc-500">
          Zatím nemáš žádný projekt.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects
          .filter((project) => !project.archived)
          .map((project) => {
            const projectItems = inbox.filter(
              (item) => item.projectId === project.id,
            );

            const completedItems = projectItems.filter(
              (item) => item.completed,
            ).length;

            return (
              <a
                key={project.id}
                href={`/project?id=${project.id}`}
                className="block rounded-2xl border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className="mb-4 h-2 rounded-full"
                  style={{
                    backgroundColor: project.color,
                  }}
                />

                <h2 className="text-lg font-semibold">{project.name}</h2>

                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-zinc-500">
                    {projectItems.length === 0
                      ? "Žádné úkoly"
                      : `${projectItems.length} ${
                          projectItems.length === 1 ? "úkol" : "úkolů"
                        }`}
                  </span>

                  {projectItems.length > 0 && (
                    <span className="text-zinc-400">
                      {completedItems}/{projectItems.length} hotovo
                    </span>
                  )}
                </div>
              </a>
            );
          })}
      </div>
    </div>
  );
}
