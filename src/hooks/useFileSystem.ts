import {
  openDialog,
  readDirTree,
  readFileContent,
  writeFileContent,
  getFileName,
  downloadFile,
  saveDialog,
} from "../platform/fileSystemAdapter";
import { isTauri } from "../platform";
import { useFileStore } from "../stores/fileStore";
import { useEditorStore } from "../stores/editorStore";
import { parseFrontmatter, serializeFrontmatter } from "../utils/frontmatter";

export const useFileSystem = () => {
  const { setRootPath, setFileTree, addRecentFile } = useFileStore();
  const { openTab } = useEditorStore();

  const openFolder = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
      });

      if (!selected) {
        return;
      }

      setRootPath(selected);

      const tree = await readDirTree(selected);
      setFileTree(tree);
    } catch (error) {
      console.error("Failed to open folder:", error);
      throw error;
    }
  };

  const openFile = async (filePath?: string) => {
    try {
      let path = filePath;

      if (!path) {
        const selected = await openDialog({
          directory: false,
          multiple: false,
          filters: [
            {
              name: "Markdown",
              extensions: ["md", "markdown"],
            },
          ],
        });

        if (!selected) {
          return;
        }

        path = selected;
      }

      const rawContent = await readFileContent(path);
      const fileName = getFileName(path);

      // Parse frontmatter from the content
      const parsed = parseFrontmatter(rawContent);

      openTab({
        id: path,
        filePath: path,
        fileName,
        content: parsed.content,
        isDirty: false,
        frontmatter: parsed.frontmatter,
      });

      addRecentFile(path);
    } catch (error) {
      console.error("Failed to open file:", error);
      throw error;
    }
  };

  const saveFile = async (
    filePath: string,
    content: string,
    frontmatter?: Record<string, any>,
  ) => {
    try {
      // Serialize content with frontmatter if it exists
      const finalContent = frontmatter
        ? serializeFrontmatter(content, frontmatter)
        : content;

      await writeFileContent(filePath, finalContent);
      return true;
    } catch (error) {
      console.error("Failed to save file:", error);
      throw error;
    }
  };

  const readFile = async (filePath: string): Promise<string> => {
    try {
      const content = await readFileContent(filePath);
      return content;
    } catch (error) {
      console.error("Failed to read file:", error);
      throw error;
    }
  };

  const newFile = () => {
    const currentTabs = useEditorStore.getState().tabs;
    const untitledPattern = /^Untitled(\d*)\.md$/;

    const existingNumbers = currentTabs
      .map((tab) => {
        const match = tab.fileName.match(untitledPattern);
        return match ? (match[1] === "" ? 1 : parseInt(match[1], 10)) : 0;
      })
      .filter((num) => num > 0);

    let nextNumber = 1;
    if (existingNumbers.length > 0) {
      const maxNumber = Math.max(...existingNumbers);
      const hasUntitled = currentTabs.some(
        (tab) => tab.fileName === "Untitled.md",
      );
      nextNumber = hasUntitled ? maxNumber + 1 : 1;
    }

    const fileName =
      nextNumber === 1 ? "Untitled.md" : `Untitled${nextNumber}.md`;
    const timestamp = Date.now();
    const newTabId = `untitled-${timestamp}`;

    openTab({
      id: newTabId,
      filePath: "", // Empty path means unsaved file
      fileName,
      content: "",
      isDirty: false,
      frontmatter: undefined,
    });
  };

  const saveFileAs = async (
    content: string,
    frontmatter?: Record<string, any>,
  ) => {
    try {
      const selected = await saveDialog({
        filters: [
          {
            name: "Markdown",
            extensions: ["md", "markdown"],
          },
        ],
      });

      if (!selected) {
        return null;
      }

      const finalContent = frontmatter
        ? serializeFrontmatter(content, frontmatter)
        : content;

      await writeFileContent(selected, finalContent);

      const fileName = getFileName(selected);

      // In web mode, trigger download
      if (!isTauri()) {
        downloadFile(finalContent, fileName);
      }

      return { path: selected, fileName };
    } catch (error) {
      console.error("Failed to save file as:", error);
      throw error;
    }
  };

  // Web-specific function to download current file
  const downloadCurrentFile = (
    content: string,
    fileName: string,
    frontmatter?: Record<string, any>,
  ) => {
    const finalContent = frontmatter
      ? serializeFrontmatter(content, frontmatter)
      : content;
    downloadFile(finalContent, fileName);
  };

  return {
    openFolder,
    openFile,
    saveFile,
    saveFileAs,
    readFile,
    newFile,
    downloadCurrentFile,
  };
};
