import { useEffect, useState } from "react";
import {
  Calendar,
  CalendarDays,
  FolderKanban,
  Home,
  Inbox,
  Menu,
  Trash2,
  Workflow,
  X,
} from "lucide-react";

const main = [
  { icon: Home, text: "Přehled", href: "/" },
  { icon: Inbox, text: "Inbox", href: "/inbox" },
  { icon: CalendarDays, text: "Dnes", href: "/today" },
  { icon: Calendar, text: "Kalendář", href: "/calendar" },
];

const moreItems = [
  { icon: FolderKanban, text: "Projekty", href: "/projects" },
  { icon: Workflow, text: "Workflow", href: "/workflows" },
  { icon: Trash2, text: "Koš", href: "/trash" },
];

export default function MobileNav() {
  const [path, setPath] = useState("/");
  const [more, setMore] = useState(false);

  useEffect(() => {
    setPath(location.pathname);
  }, []);

  const active = (href: string) =>
    href === "/" ? path === "/" : path.startsWith(href);

  const moreActive = moreItems.some((item) => active(item.href));

  return (
    <>
      {more && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button
            aria-label="Zavřít menu"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMore(false)}
          />

          <div className="absolute bottom-[76px] left-3 right-3 rounded-3xl border bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mb-2 flex items-center justify-between px-2 py-1">
              <b>Další</b>

              <button
                onClick={() => setMore(false)}
                className="rounded-xl p-2"
                aria-label="Zavřít menu"
              >
                <X size={19} />
              </button>
            </div>

            {moreItems.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMore(false)}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <Icon size={20} />
                  {item.text}
                </a>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-[70] grid h-[68px] grid-cols-5 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
        {main.map((item) => {
          const Icon = item.icon;

          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
                active(item.href)
                  ? "text-blue-600"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon size={21} />
              {item.text}
            </a>
          );
        })}

        <button
          onClick={() => setMore(true)}
          className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${
            moreActive
              ? "text-blue-600"
              : "text-zinc-500 dark:text-zinc-400"
          }`}
        >
          <Menu size={21} />
          Více
        </button>
      </nav>
    </>
  );
}