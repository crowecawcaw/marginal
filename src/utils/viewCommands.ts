export type ViewRequirement = "code" | "rendered";

export const VIEW_COMMANDS: Record<string, ViewRequirement> = {
  "format-document": "code",
  // Bold, italic, headings, and insert-table are now available in both views
  // They are removed from VIEW_COMMANDS so they're always available
};

export function isCommandAvailable(command: string, viewMode: string): boolean {
  const req = VIEW_COMMANDS[command];
  return !req || req === viewMode;
}
