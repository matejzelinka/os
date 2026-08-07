import { useEffect, useState } from "react";
import { Cloud, CloudOff, RefreshCw, LogIn, LogOut, X } from "lucide-react";
import { supabase, syncConfigured } from "@/lib/supabase";
import { syncNow } from "@/lib/sync";
type Status = "off" | "signed-out" | "syncing" | "synced" | "error";
export default function SyncControl() {
  const [status, setStatus] = useState<Status>(
      syncConfigured ? "signed-out" : "off",
    ),
    [open, setOpen] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [msg, setMsg] = useState("");
  async function run() {
    if (!syncConfigured) return;
    setStatus("syncing");
    try {
      const r = await syncNow();
      setStatus(r);
      if (r === "synced") setMsg("Synchronizováno.");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Chyba synchronizace");
    }
  }
  useEffect(() => {
    if (!supabase) return;
    run();
    const { data } = supabase.auth.onAuthStateChange(() => setTimeout(run, 0));
    const local = () => setTimeout(run, 700);
    addEventListener("os-local-change", local);
    const timer = setInterval(run, 60000);
    return () => {
      data.subscription.unsubscribe();
      removeEventListener("os-local-change", local);
      clearInterval(timer);
    };
  }, []);
  async function login() {
    if (!supabase) return;
    setMsg("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) setMsg(error.message);
    else {
      setMsg("Přihlášeno.");
      await run();
      location.reload();
    }
  }
  async function signup() {
    if (!supabase) return;
    setMsg("");
    const { error } = await supabase.auth.signUp({ email, password });
    setMsg(
      error
        ? error.message
        : "Účet vytvořen. Pokud Supabase vyžaduje potvrzení e-mailu, potvrď ho a pak se přihlas.",
    );
  }
  async function logout() {
    await supabase?.auth.signOut();
    setStatus("signed-out");
    setMsg("Odhlášeno.");
  }
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Synchronizace"
        className="rounded-xl p-2.5 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        {status === "syncing" ? (
          <RefreshCw size={19} className="animate-spin" />
        ) : status === "synced" ? (
          <Cloud size={19} className="text-green-600" />
        ) : (
          <CloudOff size={19} />
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-[90] w-[340px] rounded-2xl border bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <b>Synchronizace</b>
            <button onClick={() => setOpen(false)}>
              <X size={17} />
            </button>
          </div>
          {!syncConfigured ? (
            <div className="text-sm text-zinc-500">
              Cloud ještě není připojený. Doplň <code>PUBLIC_SUPABASE_URL</code>{" "}
              a <code>PUBLIC_SUPABASE_ANON_KEY</code> do souboru{" "}
              <code>.env</code>.
            </div>
          ) : status === "signed-out" ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-500">
                Stejným účtem se přihlas na pracovním PC i iPhonu.
              </p>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="E-mail"
                className="w-full rounded-xl border px-3 py-2.5"
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="Heslo"
                className="w-full rounded-xl border px-3 py-2.5"
              />
              <button
                onClick={login}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white"
              >
                <LogIn size={16} />
                Přihlásit
              </button>
              <button
                onClick={signup}
                className="w-full rounded-xl border px-3 py-2.5 text-sm"
              >
                První spuštění – vytvořit účet
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Cloud size={17} />
                PC a mobil používají společná cloudová data.
              </div>
              <button
                onClick={run}
                className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
              >
                <RefreshCw size={16} />
                Synchronizovat teď
              </button>
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm text-zinc-500"
              >
                <LogOut size={15} />
                Odhlásit
              </button>
            </div>
          )}
          {msg && (
            <div className="mt-3 rounded-xl bg-zinc-100 p-2.5 text-xs dark:bg-zinc-800">
              {msg}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
