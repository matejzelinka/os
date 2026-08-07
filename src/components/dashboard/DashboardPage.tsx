import { useState } from "react";
import CaptureBox from "@/components/capture/CaptureBox";
import TaskDrawer from "@/components/tasks/TaskDrawer";
import TaskListItem from "@/components/tasks/TaskListItem";
import { useInboxStore } from "@/store/inbox";
import { useProjectsStore } from "@/store/projects";

function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}

export default function DashboardPage(){
  const [selected,setSelected]=useState<string|null>(null);
  const inbox=useInboxStore(s=>s.inbox),toggle=useInboxStore(s=>s.toggleInbox),projects=useProjectsStore(s=>s.projects),today=localDate();
  const open=inbox.filter(i=>!i.completed&&!i.deletedAt),todayTasks=open.filter(i=>i.dueDate&&i.dueDate<=today),high=open.filter(i=>i.priority==="high"),active=projects.filter(p=>!p.archived);
  const focus=[...todayTasks].sort((a,b)=>(a.dueDate??"").localeCompare(b.dueDate??"")||(a.priority==="high"?-1:1)).slice(0,6);

  return <div className="space-y-8">
    <section><h1 className="text-4xl font-bold">Přehled</h1><p className="mt-2 text-zinc-500">Nejdřív zachyť, co máš v hlavě. Organizaci můžeš řešit až potom.</p></section>
    <CaptureBox/>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Inbox",open.filter(i=>!i.projectId).length,"nezpracovaných","/inbox"],
      ["Dnes",todayTasks.length,"k řešení","/today"],
      ["Priority",high.length,"vysokých","/inbox"],
      ["Projekty",active.length,"aktivních","/projects"]
    ].map(([l,v,n,h])=><a key={String(l)} href={String(h)} className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow-md"><div className="text-sm text-zinc-500">{l}</div><div className="mt-2 text-3xl font-bold">{v}</div><div className="mt-1 text-xs text-zinc-400">{n}</div></a>)}</section>

    <div className="grid gap-8 xl:grid-cols-2">
      <section><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Co řešit teď</h2><a href="/today" className="text-sm font-medium text-blue-600">Vše →</a></div>
        {focus.length===0?<div className="rounded-2xl border border-dashed bg-white p-8 text-center text-zinc-500">Na dnešek nic nehoří.</div>:<div className="space-y-3">{focus.map(i=><TaskListItem key={i.id} item={i} today={today} onToggle={()=>toggle(i.id)} onOpen={()=>setSelected(i.id)}/>)}</div>}
      </section>
      <section><div className="mb-4 flex justify-between"><h2 className="text-xl font-bold">Aktivní projekty</h2><a href="/projects" className="text-sm font-medium text-blue-600">Vše →</a></div>
        {active.length===0?<div className="rounded-2xl border border-dashed bg-white p-8 text-center text-zinc-500">Zatím žádný projekt.</div>:<div className="space-y-3">{active.slice(0,5).map(p=><a key={p.id} href={`/project?id=${p.id}`} className="block rounded-xl border bg-white p-4 font-medium hover:shadow-sm">{p.name}</a>)}</div>}
      </section>
    </div>
    <TaskDrawer taskId={selected} onClose={()=>setSelected(null)}/>
  </div>
}
