import { useProjectsStore } from "@/store/projects";

interface Props {
  value: string | null;
  onChange: (projectId: string | null) => void;
}

export default function ProjectSelect({ value, onChange }: Props) {
  const projects = useProjectsStore((state) => state.projects);

  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
    >
      <option value="">Bez projektu</option>

      {projects
        .filter((project) => !project.archived)
        .map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
    </select>
  );
}
