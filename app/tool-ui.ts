import { getToolName, isToolUIPart, UIMessage } from "ai";

export const TOOL_META: Record<string, { emoji: string; label: string }> = {
  calculator: { emoji: "🧮", label: "Kalkulator" },
  currentDateTime: { emoji: "🕐", label: "Data i czas" },
  readWebPage: { emoji: "📄", label: "Czytanie stron" },
  generateImage: { emoji: "🎨", label: "Generowanie obrazów" },
  getWeather: { emoji: "🌤️", label: "Pogoda" },
  getExchangeRate: { emoji: "💱", label: "Kurs walut" },
  getHolidays: { emoji: "📅", label: "Święta" },
  searchWikipedia: { emoji: "📖", label: "Wikipedia" },
  saveNote: { emoji: "📝", label: "Zapis notatki" },
  getNotes: { emoji: "🗒️", label: "Odczyt notatek" },
  searchKnowledge: { emoji: "📚", label: "Baza wiedzy" },
};

export type TimelineStep =
  | { kind: "tool"; toolName: string; state: string; output: unknown }
  | { kind: "search"; sources: { sourceId: string; url: string; title?: string }[] };

export function buildTimeline(parts: UIMessage["parts"]): TimelineStep[] {
  const steps: TimelineStep[] = [];
  let sourcesAdded = false;
  for (const part of parts) {
    if (isToolUIPart(part)) {
      steps.push({
        kind: "tool",
        toolName: getToolName(part),
        state: part.state,
        output: "output" in part ? part.output : undefined,
      });
    } else if (part.type === "source-url" && !sourcesAdded) {
      sourcesAdded = true;
      steps.push({
        kind: "search",
        sources: parts.filter((p) => p.type === "source-url") as {
          sourceId: string;
          url: string;
          title?: string;
        }[],
      });
    }
  }
  return steps;
}

const CITATION_REGEX = /\n*📎 (Źródło|Źródła):\s*(.+?)\s*$/;

export function splitCitation(text: string): { body: string; label: string; citation: string } | { body: string; label: null; citation: null } {
  const match = text.match(CITATION_REGEX);
  if (!match) return { body: text, label: null, citation: null };
  return { body: text.slice(0, match.index).trimEnd(), label: match[1], citation: match[2] };
}

export function summarizeOutput(output: unknown, maxLen = 220): string {
  const text = typeof output === "string" ? output : JSON.stringify(output ?? "");
  return text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;
}

export function downloadImage(dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = "ai-generated.png";
  a.click();
}

const ERROR_HINTS = [
  "nie znalazłem",
  "nie znaleziono",
  "nie udało się",
  "nie mogę obliczyć",
  "podaj ",
  "timeout",
  "błąd",
  "api zwróciło błąd",
];

export function isErrorOutput(output: unknown): boolean {
  if (typeof output !== "string") {
    if (output && typeof output === "object" && "success" in output) {
      return (output as { success?: boolean }).success === false;
    }
    return false;
  }
  const lower = output.toLowerCase();
  return ERROR_HINTS.some((hint) => lower.includes(hint));
}

export function countToolCalls(timeline: TimelineStep[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const step of timeline) {
    const name = step.kind === "search" ? "google_search" : step.toolName;
    counts[name] = (counts[name] ?? 0) + 1;
  }
  return counts;
}

export function countErrors(timeline: TimelineStep[]): number {
  return timeline.filter(
    (step) =>
      step.kind === "tool" && step.state === "output-available" && isErrorOutput(step.output),
  ).length;
}
