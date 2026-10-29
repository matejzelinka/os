import { supabase,syncConfigured } from "./supabase";
const KEYS=["os-inbox","os-projects","os-workflows"];
const META="os-sync-meta";
export type SyncStatus="off"|"signed-out"|"syncing"|"synced"|"error";
export interface SyncMeta{lastLocalChange:number;lastSync:number;}
const meta=():SyncMeta=>{try{return JSON.parse(localStorage.getItem(META)||'{"lastLocalChange":0,"lastSync":0}')}catch{return{lastLocalChange:0,lastSync:0}}};
const saveMeta=(m:SyncMeta)=>localStorage.setItem(META,JSON.stringify(m));
export function markLocalChange(){const m=meta();m.lastLocalChange=Date.now();saveMeta(m);window.dispatchEvent(new Event("os-local-change"))}
export function snapshot(){const data:any={version:2};for(const k of KEYS)data[k]=localStorage.getItem(k);return data}
export function applySnapshot(p:any){if(!p)return;for(const k of KEYS)if(typeof p[k]==="string")localStorage.setItem(k,p[k]);window.dispatchEvent(new Event("os-cloud-applied"))}
export async function currentUser(){if(!supabase)return null;return (await supabase.auth.getUser()).data.user??null}
export async function pushState(){if(!supabase)throw new Error("Synchronizace není nakonfigurovaná.");const u=await currentUser();if(!u)throw new Error("Nejsi přihlášen.");const {error}=await supabase.from("os_state").upsert({user_id:u.id,payload:snapshot(),updated_at:new Date().toISOString()});if(error)throw error;const m=meta();m.lastSync=Date.now();saveMeta(m)}
export async function pullState(){if(!supabase)throw new Error("Synchronizace není nakonfigurovaná.");const u=await currentUser();if(!u)throw new Error("Nejsi přihlášen.");const {data,error}=await supabase.from("os_state").select("payload,updated_at").eq("user_id",u.id).maybeSingle();if(error)throw error;if(data?.payload){applySnapshot(data.payload);const m=meta();m.lastSync=Date.now();saveMeta(m);return true}return false}
export async function syncNow(){
 if(!syncConfigured||!supabase)return "off" as const;
 const u=await currentUser();if(!u)return "signed-out" as const;
 const {data,error}=await supabase.from("os_state").select("payload,updated_at").eq("user_id",u.id).maybeSingle();if(error)throw error;
 const m=meta(),remote=data?.updated_at?new Date(data.updated_at).getTime():0;
 if(!data){await pushState();return "synced" as const}
 if(m.lastLocalChange>m.lastSync){await pushState();return "synced" as const}
 if(remote>m.lastSync){applySnapshot(data.payload);m.lastSync=Date.now();saveMeta(m);return "synced" as const}
 return "synced" as const;
}
