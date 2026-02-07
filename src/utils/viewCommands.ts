export type ViewRequirement = "code" | "rendered";

export const VIEW_COMMANDS: Record<string, ViewRequirement> = {
  "format-document": "code",
  "bold": "rendered",
  "italic": "rendered",
  "heading-1": "rendered",
  "heading-2": "rendered",
  "heading-3": "rendered",
  "heading-4": "rendered",
  "heading-5": "rendered",
  "insert-table": "rendered",
};

export function isCommandAvailable(command: string, viewMode: string): boolean {
  const req = VIEW_COMMANDS[command];
  return !req || req === viewMode;
}
