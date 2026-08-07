import { useEffect, useMemo, useState } from "react";
import { Bell, Moon, Sun, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { taskLink } from "@/lib/taskLinks";
import SyncControl from "@/components/SyncControl";
import {
  ensureNotificationWorker,
  getNotificationState,
  showOsNotification,
  type NotificationState,
} from "@/lib/notifications";

type Theme = "light" | "dark";
type Feedback = { kind: "ok" | "error" | "info"; text: string } | null;

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function applyTheme(t: Theme) {
  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.dataset.theme = t;
  localStorage.setItem("os-theme", t);
}
function stateText(state: NotificationState) {
  if (state === "insecure") return "Notifikace vyžadují HTTPS nebo localhost.";
  if (state === "unsupported")
    return "Tento prohlížeč systémové notifikace nepodporuje.";
  if (state === "service-worker-unavailable")
    return "Prohlížeč nepodporuje Service Worker.";
  if (state === "denied")
    return "Notifikace jsou pro tento web zablokované. Povol je v oprávněních webu.";
  return "";
}

export default function AppControls() {
  const inbox = useInboxStore((s) => s.inbox),
    projects = useProjectsStore((s) => s.projects);
  const [theme, setTheme] = useState<Theme>("light");
  const [open, setOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationState>("default");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("os-theme") as Theme | null;
    const t =
      saved ??
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(t);
    applyTheme(t);
    const st = getNotificationState();
    setPermission(st);
    if (st === "granted") ensureNotificationWorker().catch(() => {});
  }, []);

  const today = localDate();
  const alerts = useMemo(
    () =>
      inbox.filter(
        (i) =>
          !i.completed &&
          !i.deletedAt &&
          (Boolean(i.dueDate && i.dueDate <= today) ||
            Boolean(i.reminderAt && new Date(i.reminderAt) <= new Date())),
      ),
    [inbox, today],
  );

  useEffect(() => {
    if (permission !== "granted") return;
    const run = async () => {
      const now = new Date();
      for (const i of inbox.filter(
        (i) =>
          !i.completed &&
          !i.deletedAt &&
          i.reminderAt &&
          new Date(i.reminderAt) <= now,
      )) {
        const key = `os-notified:${i.id}:${i.reminderAt}`;
        if (localStorage.getItem(key)) continue;
        const p = projects.find((p) => p.id === i.projectId);
        try {
          await showOsNotification({
            title: i.title,
            body: p ? `${p.name} · připomenutí` : "Připomenutí úkolu",
            tag: key,
            url: taskLink(i.id),
          });
          localStorage.setItem(key, "1");
        } catch {}
      }
    };
    run();
    const timer = window.setInterval(run, 30000);
    return () => window.clearInterval(timer);
  }, [inbox, projects, permission]);

  async function enable() {
    setBusy(true);
    setFeedback(null);
    try {
      const st = getNotificationState();
      if (
        st === "insecure" ||
        st === "unsupported" ||
        st === "service-worker-unavailable" ||
        st === "denied"
      ) {
        setPermission(st);
        setFeedback({ kind: "error", text: stateText(st) });
        return;
      }
      await ensureNotificationWorker();
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== "granted") {
        setFeedback({
          kind: "error",
          text:
            result === "denied"
              ? "Prohlížeč notifikace zablokoval. Povol je v oprávněních webu."
              : "Povolení nebylo uděleno.",
        });
        return;
      }
      await showOsNotification({
        title: "Pracovní OS",
        body: "Upozornění jsou aktivní.",
        tag: "os-permission-test",
        url: "/",
      });
      setFeedback({
        kind: "ok",
        text: "Hotovo. Testovací systémové upozornění bylo odesláno.",
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: `Notifikaci se nepodařilo aktivovat: ${e instanceof Error ? e.message : "neznámá chyba"}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setFeedback(null);
    try {
      const st = getNotificationState();
      setPermission(st);
      if (st !== "granted") {
        setFeedback({
          kind: "error",
          text: stateText(st) || "Nejdřív povol systémová upozornění.",
        });
        return;
      }
      await showOsNotification({
        title: "Test upozornění",
        body: "Pracovní OS může posílat systémové notifikace.",
        tag: `os-manual-test-${Date.now()}`,
        url: "/",
      });
      setFeedback({
        kind: "ok",
        text: "Testovací upozornění bylo odesláno do systému.",
      });
    } catch (e) {
      setFeedback({
        kind: "error",
        text: `Test selhal: ${e instanceof Error ? e.message : "neznámá chyba"}`,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex items-center gap-1">
      <SyncControl />
      <button
        onClick={() => {
          const t = theme === "dark" ? "light" : "dark";
          setTheme(t);
          applyTheme(t);
        }}
        className="rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title={theme === "dark" ? "Světlý režim" : "Tmavý režim"}
      >
        {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
      </button>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        title="Upozornění"
      >
        <Bell size={19} />
        {alerts.length > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {alerts.length > 9 ? "9+" : alerts.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-[390px] overflow-hidden rounded-2xl border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-zinc-800">
            <div>
              <div className="font-semibold">Upozornění</div>
              <div className="text-xs text-zinc-400">
                {alerts.length} aktuálních
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X size={17} />
            </button>
          </div>

          <div className="border-b bg-blue-50 p-4 dark:border-zinc-800 dark:bg-blue-950/30">
            {permission === "granted" ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
                  <CheckCircle2 size={17} />
                  Systémová upozornění jsou aktivní
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Připomenutí kontrolujeme každých 30 sekund, když je OS
                  otevřený.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={test}
                  className="mt-3 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-blue-400 dark:hover:bg-zinc-800"
                >
                  {busy ? "Odesílám…" : "Poslat test"}
                </button>
              </>
            ) : (
              <>
                <div className="text-sm font-medium">
                  Povolit systémová upozornění
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {stateText(permission) ||
                    "OS tě upozorní v čase nastaveném u úkolu."}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={enable}
                  className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {busy ? "Aktivuji…" : "Povolit upozornění"}
                </button>
              </>
            )}

            {feedback && (
              <div
                className={`mt-3 flex gap-2 rounded-xl p-3 text-xs ${feedback.kind === "ok" ? "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300"}`}
              >
                {feedback.kind === "ok" ? (
                  <CheckCircle2 size={16} className="shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-400">
                Nic aktuálního.
              </div>
            ) : (
              alerts.map((i) => {
                const p = projects.find((p) => p.id === i.projectId),
                  late = Boolean(i.dueDate && i.dueDate < today);
                return (
                  <a
                    key={i.id}
                    href={taskLink(i.id)}
                    className="block border-b px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                  >
                    <div className="text-sm font-medium">{i.title}</div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {p?.name ?? "Bez projektu"} ·{" "}
                      {late
                        ? "Po termínu"
                        : i.dueDate === today
                          ? "Dnes"
                          : "Připomenutí"}
                    </div>
                  </a>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
