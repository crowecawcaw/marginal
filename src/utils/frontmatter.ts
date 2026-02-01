import matter from "gray-matter";

export interface ParsedMarkdown {
  content: string;
  frontmatter: Record<string, any>;
  rawFrontmatter: string;
}

/**
 * Parse markdown content with frontmatter
 */
export const parseFrontmatter = (rawContent: string): ParsedMarkdown => {
  try {
    const parsed = matter(rawContent);

    return {
      content: parsed.content,
      frontmatter: parsed.data,
      rawFrontmatter: parsed.matter || "",
    };
  } catch (error) {
    console.error("Failed to parse frontmatter:", error);
    return {
      content: rawContent,
      frontmatter: {},
      rawFrontmatter: "",
    };
  }
};

/**
 * Serialize markdown content with frontmatter
 */
export const serializeFrontmatter = (
  content: string,
  frontmatter: Record<string, any>,
): string => {
  // If there's no frontmatter, return content as-is
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }

  try {
    return matter.stringify(content, frontmatter);
  } catch (error) {
    console.error("Failed to serialize frontmatter:", error);
    return content;
  }
};

/**
 * Check if content has frontmatter
 */
export const hasFrontmatter = (content: string): boolean => {
  return content.trimStart().startsWith("---");
};
