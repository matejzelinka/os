import { createClient } from "@supabase/supabase-js";
const url=import.meta.env.PUBLIC_SUPABASE_URL;
const key=import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
export const syncConfigured=Boolean(url&&key&&!url.includes("YOUR_PROJECT"));
export const supabase=syncConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;
