import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the isTauri function
vi.mock("./index", () => ({
  isTauri: vi.fn(() => false),
}));

// Import after mocking
import { confirmUnsavedChanges } from "./fileSystemAdapter";

describe("fileSystemAdapter", () => {
  describe("confirmUnsavedChanges", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('returns "save" when user confirms in web mode', async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      const result = await confirmUnsavedChanges("test.md");

      expect(result).toBe("save");
      expect(window.confirm).toHaveBeenCalledWith(
        '"test.md" has unsaved changes. Click OK to save, or Cancel to discard changes.',
      );
    });

    it('returns "discard" when user cancels in web mode', async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);

      const result = await confirmUnsavedChanges("test.md");

      expect(result).toBe("discard");
    });

    it("includes filename in the confirmation message", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);

      await confirmUnsavedChanges("My Document.md");

      expect(window.confirm).toHaveBeenCalledWith(
        expect.stringContaining("My Document.md"),
      );
    });
  });
});
