export function taskLink(taskId:string){
  return `/inbox?task=${encodeURIComponent(taskId)}`;
}
export function taskIdFromUrl(){
  if(typeof window==="undefined") return null;
  return new URLSearchParams(window.location.search).get("task");
}
