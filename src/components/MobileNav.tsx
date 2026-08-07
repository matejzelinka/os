import { useEffect,useState } from "react";
import { CalendarDays,FolderKanban,Home,Inbox,Menu,Trash2,Workflow,X } from "lucide-react";
const main=[
 {icon:Home,text:"Přehled",href:"/"},
 {icon:Inbox,text:"Inbox",href:"/inbox"},
 {icon:CalendarDays,text:"Dnes",href:"/today"},
 {icon:FolderKanban,text:"Projekty",href:"/projects"}
];
export default function MobileNav(){
 const [path,setPath]=useState("/"),[more,setMore]=useState(false);
 useEffect(()=>setPath(location.pathname),[]);
 const active=(href:string)=>href==="/"?path==="/":path.startsWith(href);
 return <>
  {more&&<div className="fixed inset-0 z-[80] md:hidden">
   <button aria-label="Zavřít menu" className="absolute inset-0 bg-black/30" onClick={()=>setMore(false)}/>
   <div className="absolute bottom-[76px] left-3 right-3 rounded-3xl border bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
    <div className="mb-2 flex items-center justify-between px-2 py-1"><b>Další</b><button onClick={()=>setMore(false)} className="rounded-xl p-2"><X size={19}/></button></div>
    <a href="/upcoming" className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"><CalendarDays size={20}/>Nadcházející</a>
    <a href="/workflows" className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Workflow size={20}/>Workflow</a>
    <a href="/trash" className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Trash2 size={20}/>Koš</a>
   </div>
  </div>}
  <nav className="fixed inset-x-0 bottom-0 z-[70] grid h-[68px] grid-cols-5 border-t bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
   {main.map(i=>{const Icon=i.icon;return <a key={i.href} href={i.href} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${active(i.href)?"text-blue-600":"text-zinc-500 dark:text-zinc-400"}`}><Icon size={21}/>{i.text}</a>})}
   <button onClick={()=>setMore(true)} className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium ${["/upcoming","/workflows","/trash"].some(x=>path.startsWith(x))?"text-blue-600":"text-zinc-500 dark:text-zinc-400"}`}><Menu size={21}/>Více</button>
  </nav>
 </>;
}
