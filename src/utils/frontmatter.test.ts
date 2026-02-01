import { describe, it, expect } from "vitest";
import { parseFrontmatter, serializeFrontmatter, hasFrontmatter } from "./frontmatter";

describe("frontmatter", () => {
  describe("parseFrontmatter", () => {
    it("extracts frontmatter from content with YAML", () => {
      const content = `---
title: Test
author: John
---
# Hello World`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe("Test");
      expect(result.frontmatter.author).toBe("John");
      expect(result.content.trim()).toBe("# Hello World");
    });

    it("returns empty frontmatter when no YAML present", () => {
      const content = `# Hello World

Some content here.`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe(content);
      expect(result.rawFrontmatter).toBe("");
    });

    it("handles empty content", () => {
      const result = parseFrontmatter("");

      expect(result.frontmatter).toEqual({});
      expect(result.content).toBe("");
    });

    it("handles frontmatter with nested objects", () => {
      const content = `---
meta:
  description: A test file
  tags:
    - test
    - example
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.meta.description).toBe("A test file");
      expect(result.frontmatter.meta.tags).toEqual(["test", "example"]);
    });

    it("handles frontmatter with special characters", () => {
      const content = `---
title: "Hello: World"
description: 'A "quoted" string'
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.title).toBe("Hello: World");
      expect(result.frontmatter.description).toBe('A "quoted" string');
    });

    it("handles content that starts with --- but is not frontmatter", () => {
      const content = `---
This is not valid YAML because it has no key-value pairs
---
Content`;

      const result = parseFrontmatter(content);
      // gray-matter treats this as frontmatter with the text as value
      // Just verify it doesn't crash
      expect(result.content).toBeDefined();
    });

    it("preserves rawFrontmatter for reconstruction", () => {
      const content = `---
title: Test
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.rawFrontmatter).toContain("title: Test");
    });

    it("handles frontmatter with dates", () => {
      const content = `---
date: 2024-01-15
---
Content`;

      const result = parseFrontmatter(content);

      // gray-matter parses dates as Date objects
      expect(result.frontmatter.date).toBeDefined();
    });

    it("handles frontmatter with booleans and numbers", () => {
      const content = `---
published: true
draft: false
count: 42
price: 19.99
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter.published).toBe(true);
      expect(result.frontmatter.draft).toBe(false);
      expect(result.frontmatter.count).toBe(42);
      expect(result.frontmatter.price).toBe(19.99);
    });

    it("handles empty frontmatter block", () => {
      const content = `---
---
Content`;

      const result = parseFrontmatter(content);

      expect(result.frontmatter).toEqual({});
      expect(result.content.trim()).toBe("Content");
    });

    it("handles frontmatter with only whitespace", () => {
      const content = `---

---
Content`;

      const result = parseFrontmatter(content);

      expect(result.content.trim()).toBe("Content");
    });
  });

  describe("serializeFrontmatter", () => {
    it("prepends frontmatter to content", () => {
      const content = "# Hello World";
      const frontmatter = { title: "Test", author: "John" };

      const result = serializeFrontmatter(content, frontmatter);

      expect(result).toContain("---");
      expect(result).toContain("title: Test");
      expect(result).toContain("author: John");
      expect(result).toContain("# Hello World");
    });

    it("returns content unchanged when frontmatter is empty object", () => {
      const content = "# Hello World";

      const result = serializeFrontmatter(content, {});

      expect(result).toBe(content);
    });

    it("returns content unchanged when frontmatter is null", () => {
      const content = "# Hello World";

      const result = serializeFrontmatter(content, null as any);

      expect(result).toBe(content);
    });

    it("returns content unchanged when frontmatter is undefined", () => {
      const content = "# Hello World";

      const result = serializeFrontmatter(content, undefined as any);

      expect(result).toBe(content);
    });

    it("handles nested objects in frontmatter", () => {
      const content = "Content";
      const frontmatter = {
        meta: {
          tags: ["a", "b"],
          nested: { value: 1 },
        },
      };

      const result = serializeFrontmatter(content, frontmatter);

      expect(result).toContain("meta:");
      expect(result).toContain("tags:");
      expect(result).toContain("- a");
      expect(result).toContain("- b");
    });

    it("handles special characters in values", () => {
      const content = "Content";
      const frontmatter = {
        title: "Hello: World",
        description: 'A "quoted" value',
      };

      const result = serializeFrontmatter(content, frontmatter);

      // Verify it's valid YAML by parsing it back
      const parsed = parseFrontmatter(result);
      expect(parsed.frontmatter.title).toBe("Hello: World");
      expect(parsed.frontmatter.description).toBe('A "quoted" value');
    });

    it("handles empty content with frontmatter", () => {
      const result = serializeFrontmatter("", { title: "Test" });

      expect(result).toContain("title: Test");
    });
  });

  describe("hasFrontmatter", () => {
    it("returns true for content with frontmatter", () => {
      const content = `---
title: Test
---
Content`;

      expect(hasFrontmatter(content)).toBe(true);
    });

    it("returns false for content without frontmatter", () => {
      const content = `# Hello World

Some content.`;

      expect(hasFrontmatter(content)).toBe(false);
    });

    it("returns true for content starting with --- after whitespace", () => {
      const content = `   ---
title: Test
---
Content`;

      expect(hasFrontmatter(content)).toBe(true);
    });

    it("returns false for empty string", () => {
      expect(hasFrontmatter("")).toBe(false);
    });

    it("returns false for content with --- not at start", () => {
      const content = `# Title
---
Not frontmatter`;

      expect(hasFrontmatter(content)).toBe(false);
    });

    it("returns true for just the opening ---", () => {
      expect(hasFrontmatter("---")).toBe(true);
    });

    it("handles newlines before frontmatter", () => {
      const content = `
---
title: Test
---`;

      expect(hasFrontmatter(content)).toBe(true);
    });
  });

  describe("roundtrip", () => {
    it("preserves content through parse and serialize", () => {
      const original = `---
title: Test Document
author: Jane Doe
tags:
  - markdown
  - test
---
# Hello World

This is the body content.`;

      const parsed = parseFrontmatter(original);
      const serialized = serializeFrontmatter(parsed.content, parsed.frontmatter);
      const reparsed = parseFrontmatter(serialized);

      expect(reparsed.frontmatter.title).toBe("Test Document");
      expect(reparsed.frontmatter.author).toBe("Jane Doe");
      expect(reparsed.frontmatter.tags).toEqual(["markdown", "test"]);
      expect(reparsed.content.trim()).toBe(parsed.content.trim());
    });

    it("preserves content without frontmatter through roundtrip", () => {
      const original = `# Hello World

Just content, no frontmatter.`;

      const parsed = parseFrontmatter(original);
      const serialized = serializeFrontmatter(parsed.content, parsed.frontmatter);

      expect(serialized).toBe(original);
    });
  });
});
