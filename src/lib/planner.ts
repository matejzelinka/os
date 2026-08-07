import { allWorkflows } from "@/store/workflows";
import type { WorkflowTemplate } from "@/types/workflow";

export interface PlannerResult {
  workflow?: WorkflowTemplate;
  confidence: number;
  reason: string;
}

const KEYWORDS: Record<string, string[]> = {
  "kulturni-akce": [
    "koncert",
    "divadlo",
    "ples",
    "festival",
    "výstava",
    "vernisáž",
    "kino",
    "akce",
    "představení",
    "hudba",
  ],

  web: ["web", "webovky", "landing page", "microsite", "eshop", "seo"],

  social: [
    "facebook",
    "instagram",
    "linkedin",
    "reels",
    "příspěvek",
    "sítě",
    "kampaň",
  ],

  skoleni: ["školení", "workshop", "seminář", "kurz", "lektorské"],
};

export function recognizeWorkflow(
  text: string,
  workflows: WorkflowTemplate[],
): PlannerResult {
  const input = text.toLowerCase();

  let best: WorkflowTemplate | undefined;
  let bestScore = 0;

  for (const workflow of workflows) {
    const words = KEYWORDS[workflow.id] ?? [];

    let score = 0;

    for (const word of words) {
      if (input.includes(word)) score++;
    }

    if (score > bestScore) {
      best = workflow;
      bestScore = score;
    }
  }

  if (!best)
    return {
      confidence: 0,
      reason: "Žádné workflow nebylo rozpoznáno.",
    };

  return {
    workflow: best,

    confidence: Math.min(bestScore / 3, 1),

    reason: "Rozpoznáno podle klíčových slov.",
  };
}
