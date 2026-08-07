import { useState } from "react";
import CaptureBox from "@/components/capture/CaptureBox";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskListItem from "@/components/tasks/TaskListItem";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function recommendationRank(
  task: { dueDate?: string | null; priority: string },
  today: string,
) {
  if (task.dueDate && task.dueDate < today) return 0;
  if (task.dueDate === today) return 1;
  if (task.priority === "high") return 2;
  if (task.priority === "normal") return 3;
  return 4;
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("cs-CZ", {
    day: "numeric",
    month: "numeric",
  });
}

export default function DashboardPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const inbox = useInboxStore((s) => s.inbox);
  const toggle = useInboxStore((s) => s.toggleInbox);
  const projects = useProjectsStore((s) => s.projects);
  const today = localDate();
  const openTasks = inbox.filter((task) => !task.completed && !task.deletedAt);
  const overdueTasks = openTasks.filter(
    (task) => task.dueDate && task.dueDate < today,
  );
  const todayTasks = openTasks.filter((task) => task.dueDate === today);
  const activeProjects = projects.filter((project) => !project.archived);
  const recommendations = [...openTasks]
    .sort(
      (a, b) =>
        recommendationRank(a, today) - recommendationRank(b, today) ||
        (a.dueDate ?? "9999-12-31").localeCompare(
          b.dueDate ?? "9999-12-31",
        ),
    )
    .slice(0, 5);

  const projectSummaries = activeProjects.map((project) => {
    const projectTasks = inbox.filter((task) => task.projectId === project.id);
    const completed = projectTasks.filter((task) => task.completed).length;
    const remaining = projectTasks.filter(
      (task) => !task.completed && !task.deletedAt,
    ).length;
    const total = completed + remaining;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const nearestDueDate = projectTasks
      .filter((task) => !task.completed && !task.deletedAt && task.dueDate)
      .map((task) => task.dueDate!)
      .sort()[0];
    const activityDates = [
      project.createdAt,
      ...projectTasks.map((task) => task.createdAt),
      ...projectTasks.flatMap((task) =>
        task.completedAt ? [task.completedAt] : [],
      ),
    ];
    const lastActivity = Math.max(
      ...activityDates.map((value) => new Date(value).getTime()),
    );
    const inactiveForSevenDays =
      Date.now() - lastActivity > 7 * 24 * 60 * 60 * 1000;

    return {
      project,
      completed,
      remaining,
      progress,
      nearestDueDate,
      inactiveForSevenDays,
      hasNoCompletedTask: completed === 0,
    };
  });
  const attentionProjects = projectSummaries.filter(
    (summary) => summary.inactiveForSevenDays || summary.hasNoCompletedTask,
  );
  const hasAttention = overdueTasks.length > 0 || attentionProjects.length > 0;

  return (
    <div className="space-y-8">
      <CaptureBox />

      <section>
        <h1 className="text-4xl font-bold">Přehled</h1>
        <p className="mt-2 text-zinc-500">
          To nejdůležitější pro dnešní práci na jednom místě.
        </p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">📊 Dnes</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["Aktivní úkoly", openTasks.length],
            ["Dnešní úkoly", todayTasks.length],
            ["Projekty", activeProjects.length],
            ["Po termínu", overdueTasks.length],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border bg-white p-5">
              <div className="text-sm text-zinc-500">{label}</div>
              <div className="mt-2 text-3xl font-bold">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">🎯 Dnes doporučuji</h2>
          <a href="/today" className="text-sm font-medium text-blue-600">
            Otevřít dnešek →
          </a>
        </div>
        {recommendations.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-zinc-500">
            Nemáš žádné aktivní úkoly.
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations.map((task) => (
              <TaskListItem
                key={task.id}
                item={task}
                today={today}
                onToggle={() => toggle(task.id)}
                onOpen={() => setSelected(task.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">📊 Dnes</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <h2 className="text-xl font-bold">📁 Rozpracované projekty</h2>
          <a href="/projects" className="text-sm font-medium text-blue-600">
            Všechny projekty →
          </a>
        </div>
        {projectSummaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-zinc-500">
            Zatím nemáš žádný aktivní projekt.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectSummaries.map((summary) => (
              <a
                key={summary.project.id}
                href={`/project?id=${summary.project.id}`}
                className="rounded-2xl border bg-white p-5 hover:border-zinc-300"
              >
                <div
                  className="mb-4 h-2 rounded-full"
                  style={{ backgroundColor: summary.project.color }}
                />
                <h3 className="font-semibold">{summary.project.name}</h3>
                <div className="mt-3 flex justify-between text-sm text-zinc-500">
                  <span>{summary.completed} dokončeno</span>
                  <span>{summary.remaining} zbývá</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${summary.progress}%`,
                      backgroundColor: summary.project.color,
                    }}
                  />
                </div>
                <div className="mt-3 text-xs text-zinc-400">
                  {summary.nearestDueDate
                    ? `Nejbližší termín: ${formatDate(summary.nearestDueDate)}`
                    : "Nejbližší termín: bez termínu"}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold">⚠ Vyžaduje pozornost</h2>
        {!hasAttention ? (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-zinc-500">
            Nic naléhavého.
          </div>
        ) : (
          <div className="space-y-3">
            {overdueTasks.map((task) => (
              <TaskListItem
                key={task.id}
                item={task}
                today={today}
                onToggle={() => toggle(task.id)}
                onOpen={() => setSelected(task.id)}
              />
            ))}
            {attentionProjects.map((summary) => (
              <a
                key={summary.project.id}
                href={`/project?id=${summary.project.id}`}
                className="block rounded-2xl border border-amber-200 bg-amber-50 p-4"
              >
                <div className="font-medium text-amber-950">
                  {summary.project.name}
                </div>
                <div className="mt-1 text-sm text-amber-900">
                  {[
                    summary.inactiveForSevenDays
                      ? "bez aktivity déle než 7 dní"
                      : null,
                    summary.hasNoCompletedTask
                      ? "zatím bez dokončeného úkolu"
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <TaskDrawer taskId={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
