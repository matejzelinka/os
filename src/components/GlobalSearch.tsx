import { useEffect,useMemo,useRef,useState } from "react";
import { Search,X,Command } from "lucide-react";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";
import { taskLink } from "@/lib/taskLinks";

export default function GlobalSearch(){
 const [query,setQuery]=useState(""),[open,setOpen]=useState(false);
 const input=useRef<HTMLInputElement>(null),inbox=useInboxStore(s=>s.inbox),projects=useProjectsStore(s=>s.projects);
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();setOpen(true);setTimeout(()=>input.current?.focus(),0)}if(e.key==="Escape"){setOpen(false);setQuery("")}};addEventListener("keydown",f);return()=>removeEventListener("keydown",f)},[]);
 const q=query.trim().toLocaleLowerCase("cs");
 const tasks=useMemo(()=>q?inbox.filter(i=>!i.deletedAt&&`${i.title} ${i.note??""}`.toLocaleLowerCase("cs").includes(q)).slice(0,8):[],[q,inbox]);
 const ps=useMemo(()=>q?projects.filter(p=>p.name.toLocaleLowerCase("cs").includes(q)).slice(0,5):[],[q,projects]);
 const nav=[["Přehled","/"],["Inbox","/inbox"],["Dnes","/today"],["Nadcházející","/upcoming"],["Projekty","/projects"],["Workflow","/workflows"],["Nastavení","/settings"]].filter(x=>!q||x[0].toLocaleLowerCase("cs").includes(q));
 return <div className="relative w-full max-w-xl">
  <div className="flex items-center gap-3 rounded-xl border bg-zinc-50 px-4 py-2.5" onClick={()=>setOpen(true)}><Search size={18} className="text-zinc-400"/><input ref={input} value={query} onFocus={()=>setOpen(true)} onChange={e=>setQuery(e.target.value)} className="w-full bg-transparent text-sm outline-none" placeholder="Hledat úkol, poznámku, projekt…"/><span className="flex items-center gap-1 rounded border bg-white px-1.5 py-0.5 text-[11px] text-zinc-400"><Command size={11}/>K</span>{query&&<button onClick={()=>setQuery("")}><X size={16}/></button>}</div>
  {open&&<><button aria-label="Zavřít" onClick={()=>setOpen(false)} className="fixed inset-0 z-40 cursor-default bg-transparent"/><div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-auto rounded-2xl border bg-white p-2 shadow-2xl dark:bg-zinc-900">
   <div className="px-3 py-2 text-xs font-semibold uppercase text-zinc-400">Navigace</div>{nav.map(([n,h])=><a key={h} href={h} className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800">{n}</a>)}
   {tasks.length>0&&<><div className="mt-2 px-3 py-2 text-xs font-semibold uppercase text-zinc-400">Úkoly a poznámky</div>{tasks.map(i=>{const p=projects.find(p=>p.id===i.projectId);return <a key={i.id} href={taskLink(i.id)} className="block rounded-xl px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"><div className="text-sm font-medium">{i.title}</div><div className="mt-0.5 text-xs text-zinc-400">{p?.name??"Bez projektu"}{i.note?" · obsahuje poznámku":""}</div></a>})}</>}
   {ps.length>0&&<><div className="mt-2 px-3 py-2 text-xs font-semibold uppercase text-zinc-400">Projekty</div>{ps.map(p=><a key={p.id} href={`/project?id=${p.id}`} className="block rounded-xl px-3 py-2 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">{p.name}</a>)}</>}
   {q&&tasks.length===0&&ps.length===0&&nav.length===0&&<div className="p-6 text-center text-sm text-zinc-400">Nic jsem nenašel.</div>}
  </div></>}
 </div>
}
