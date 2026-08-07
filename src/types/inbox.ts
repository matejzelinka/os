export type TaskPriority="low"|"normal"|"high";
export interface Subtask{id:string;title:string;completed:boolean;}
export interface InboxItem{id:string;title:string;completed:boolean;createdAt:string;completedAt?:string|null;deletedAt?:string|null;projectId:string|null;priority:TaskPriority;dueDate?:string|null;reminderAt?:string|null;note?:string;subtasks?:Subtask[];}
export interface NewTaskOptions{projectId?:string|null;priority?:TaskPriority;dueDate?:string|null;reminderAt?:string|null;note?:string;subtasks?:Subtask[];}
