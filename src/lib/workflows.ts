import type { WorkflowTemplate } from "@/types/workflow";
export const builtinWorkflows: WorkflowTemplate[] = [
  {
    id: "publish-event",
    name: "Zveřejnit kulturní akci",
    description: "Kompletní příprava a publikace nové kulturní akce.",
    needsDate: true,
    builtin: true,
    steps: [
      {
        id: "sale",
        title: "Zadat akci do prodejního systému",
        daysBefore: 60,
        priority: "high",
      },
      {
        id: "poster",
        title: "Připravit plakát",
        daysBefore: 45,
        priority: "high",
      },
      {
        id: "square",
        title: "Připravit čtverec pro sociální sítě",
        daysBefore: 35,
        priority: "normal",
      },
      {
        id: "webgraphic",
        title: "Připravit grafiku na web",
        daysBefore: 35,
        priority: "normal",
      },
      {
        id: "article",
        title: "Napsat článek na web",
        daysBefore: 30,
        priority: "normal",
      },
      {
        id: "calendar",
        title: "Vložit akci do kalendáře",
        daysBefore: 30,
        priority: "normal",
      },
      {
        id: "facebook",
        title: "Založit / zveřejnit událost na Facebooku",
        daysBefore: 30,
        priority: "normal",
      },
      {
        id: "promo",
        title: "Naplánovat propagaci na sociálních sítích",
        daysBefore: 14,
        priority: "high",
      },
      {
        id: "salescheck",
        title: "Zkontrolovat prodej vstupenek",
        daysBefore: 7,
        priority: "normal",
      },
      {
        id: "reminder",
        title: "Připomenout akci na sociálních sítích",
        daysBefore: 3,
        priority: "high",
      },
    ],
  },
];
export function dateBefore(date: string, days = 0) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
