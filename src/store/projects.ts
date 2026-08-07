import { create } from "zustand";
import type { Project } from "@/types/project";
import { createId } from "@/lib/ids";
import { loadProjects, saveProjects } from "@/lib/storage";
interface ProjectsStore { projects:Project[]; addProject:(name:string)=>void; createProject:(name:string)=>string; updateProject:(id:string,changes:Partial<Pick<Project,"name"|"color"|"archived">>)=>void; }
export const useProjectsStore=create<ProjectsStore>((set)=>({projects:loadProjects(),addProject:name=>set(state=>{const projects=[{id:createId(),name,color:"#2563eb",archived:false,createdAt:new Date().toISOString()},...state.projects];saveProjects(projects);return{projects};}),createProject:name=>{const id=createId();set(state=>{const projects=[{id,name,color:"#2563eb",archived:false,createdAt:new Date().toISOString()},...state.projects];saveProjects(projects);return{projects};});return id;},updateProject:(id,changes)=>set(state=>{const projects=state.projects.map(p=>p.id===id?{...p,...changes}:p);saveProjects(projects);return{projects};})}));
