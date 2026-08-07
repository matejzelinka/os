import {create} from "zustand";import type{InboxItem,NewTaskOptions,TaskPriority}from "@/types/inbox";import{createId}from "@/lib/ids";import{loadInbox,saveInbox}from "@/lib/storage";import{addAttachment,deleteTaskAttachments,getAttachments}from "@/lib/attachments";
type E=Pick<InboxItem,"title"|"projectId"|"priority"|"dueDate"|"reminderAt"|"repeatType"|"repeatInterval"|"note"|"subtasks">;
interface S{inbox:InboxItem[];addInbox:(t:string,o?:NewTaskOptions)=>string;addManyInbox:(x:Array<{title:string;options?:NewTaskOptions}>)=>void;toggleInbox:(id:string)=>void;deleteInbox:(id:string)=>void;restoreInbox:(id:string)=>void;permanentlyDelete:(id:string)=>Promise<void>;emptyTrash:()=>Promise<void>;cleanupTrash:()=>Promise<void>;updateInbox:(id:string,c:Partial<E>)=>void;assignInboxToProject:(id:string,p:string|null)=>void;setPriority:(id:string,p:TaskPriority)=>void;setDueDate:(id:string,d:string|null)=>void;addSubtask:(id:string,t:string)=>void;toggleSubtask:(id:string,s:string)=>void;deleteSubtask:(id:string,s:string)=>void;}
const norm=(i:InboxItem):InboxItem=>({...i,projectId:i.projectId??null,priority:i.priority??"normal",dueDate:i.dueDate??null,reminderAt:i.reminderAt??null,repeatType:i.repeatType??"none",repeatInterval:i.repeatInterval??1,note:i.note??"",subtasks:i.subtasks??[],completedAt:i.completedAt??null,deletedAt:i.deletedAt??null});
function getNextRecurrenceDate(
  dueDate: string | null | undefined,
  repeatType: InboxItem["repeatType"],
  repeatInterval?: number,
) {
  if (!dueDate || !repeatType || repeatType === "none") return null;
  const date = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  switch (repeatType) {
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + 1);
      break;
    case "interval": {
      const interval = repeatInterval && repeatInterval > 0 ? repeatInterval : 1;
      date.setDate(date.getDate() + interval);
      break;
    }
    default:
      return null;
  }
  return date.toISOString().slice(0, 10);
}
async function copyTaskAttachments(fromId: string, toId: string) {
  try {
    const attachments = await getAttachments(fromId);
    await Promise.all(
      attachments.map((attachment) =>
        addAttachment(
          toId,
          new File([attachment.blob], attachment.name, { type: attachment.type }),
        ),
      ),
    );
  } catch {
    // Preserve recurrence even if attachment copy fails.
  }
}
export const useInboxStore=create<S>((set,get)=>({inbox:loadInbox().map(norm),
addInbox:(title,o={})=>{const id=createId();set(s=>{const inbox=[{id,title,completed:false,createdAt:new Date().toISOString(),completedAt:null,deletedAt:null,projectId:o.projectId??null,priority:o.priority??"normal",dueDate:o.dueDate??null,reminderAt:o.reminderAt??null,repeatType:o.repeatType??"none",repeatInterval:o.repeatInterval??1,note:o.note??"",subtasks:o.subtasks??[]} ,...s.inbox];saveInbox(inbox);return{inbox}});return id},
addManyInbox:xs=>set(s=>{const n=new Date().toISOString(),c=xs.map(x=>({id:createId(),title:x.title,completed:false,createdAt:n,completedAt:null,deletedAt:null,projectId:x.options?.projectId??null,priority:x.options?.priority??"normal",dueDate:x.options?.dueDate??null,reminderAt:x.options?.reminderAt??null,repeatType:x.options?.repeatType??"none",repeatInterval:x.options?.repeatInterval??1,note:x.options?.note??"",subtasks:x.options?.subtasks??[]}));const inbox=[...c,...s.inbox];saveInbox(inbox);return{inbox}}),
toggleInbox:id=>{const task=get().inbox.find((i)=>i.id===id);if(!task)return;const n=new Date().toISOString();const nextDueDate=getNextRecurrenceDate(task.dueDate,task.repeatType,task.repeatInterval);const isRecurring=Boolean(task.repeatType && task.repeatType!="none");const nextTask=nextDueDate?{id:createId(),title:task.title,completed:false,createdAt:n,completedAt:null,deletedAt:null,projectId:task.projectId,priority:task.priority,dueDate:nextDueDate,reminderAt:task.reminderAt,repeatType:task.repeatType,repeatInterval:task.repeatInterval,note:task.note,subtasks:(task.subtasks??[]).map((step)=>({id:createId(),title:step.title,completed:false}))}:null;set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,completed:true,completedAt:n,deletedAt:isRecurring?i.deletedAt:n}:i);const nextInbox=nextTask? [nextTask,...inbox] : inbox;saveInbox(nextInbox);return{inbox:nextInbox}});if(nextTask){copyTaskAttachments(id,nextTask.id);} },
deleteInbox:id=>set(s=>{const n=new Date().toISOString(),inbox=s.inbox.map(i=>i.id===id?{...i,deletedAt:n}:i);saveInbox(inbox);return{inbox}}),
restoreInbox:id=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,completed:false,completedAt:null,deletedAt:null}:i);saveInbox(inbox);return{inbox}}),
permanentlyDelete:async id=>{await deleteTaskAttachments(id);set(s=>{const inbox=s.inbox.filter(i=>i.id!==id);saveInbox(inbox);return{inbox}})},
emptyTrash:async()=>{const a=get().inbox.filter(i=>i.deletedAt);await Promise.all(a.map(i=>deleteTaskAttachments(i.id)));set(s=>{const inbox=s.inbox.filter(i=>!i.deletedAt);saveInbox(inbox);return{inbox}})},
cleanupTrash:async()=>{const lim=Date.now()-604800000,a=get().inbox.filter(i=>i.deletedAt&&new Date(i.deletedAt).getTime()<lim);await Promise.all(a.map(i=>deleteTaskAttachments(i.id)));const ids=new Set(a.map(i=>i.id));set(s=>{const inbox=s.inbox.filter(i=>!ids.has(i.id));saveInbox(inbox);return{inbox}})},
updateInbox:(id,c)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,...c}:i);saveInbox(inbox);return{inbox}}),assignInboxToProject:(id,projectId)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,projectId}:i);saveInbox(inbox);return{inbox}}),setPriority:(id,priority)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,priority}:i);saveInbox(inbox);return{inbox}}),setDueDate:(id,dueDate)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,dueDate}:i);saveInbox(inbox);return{inbox}}),addSubtask:(id,title)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,subtasks:[...(i.subtasks??[]),{id:createId(),title,completed:false}]}:i);saveInbox(inbox);return{inbox}}),toggleSubtask:(id,sid)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,subtasks:(i.subtasks??[]).map(x=>x.id===sid?{...x,completed:!x.completed}:x)}:i);saveInbox(inbox);return{inbox}}),deleteSubtask:(id,sid)=>set(s=>{const inbox=s.inbox.map(i=>i.id===id?{...i,subtasks:(i.subtasks??[]).filter(x=>x.id!==sid)}:i);saveInbox(inbox);return{inbox}})}));
