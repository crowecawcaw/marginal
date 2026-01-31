import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileStore } from '../stores/fileStore';
import { useEditorStore } from '../stores/editorStore';
import { FileNode } from '../types';
import { parseFrontmatter, serializeFrontmatter } from '../utils/frontmatter';

export const useFileSystem = () => {
  const { setRootPath, setFileTree, addRecentFile } = useFileStore();
  const { openTab } = useEditorStore();

  const openFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
      });

      if (!selected || typeof selected !== 'string') {
        return;
      }

      setRootPath(selected);

      const tree = await invoke<FileNode[]>('read_dir_tree', {
        path: selected,
      });

      setFileTree(tree);
    } catch (error) {
      console.error('Failed to open folder:', error);
      throw error;
    }
  };

  const openFile = async (filePath?: string) => {
    try {
      let path = filePath;

      if (!path) {
        const selected = await open({
          directory: false,
          multiple: false,
          filters: [
            {
              name: 'Markdown',
              extensions: ['md', 'markdown'],
            },
          ],
        });

        if (!selected || typeof selected !== 'string') {
          return;
        }

        path = selected;
      }

      const rawContent = await invoke<string>('read_file_content', {
        path,
      });

      const fileName = path.split('/').pop() || path.split('\\').pop() || 'Untitled';

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
      console.error('Failed to open file:', error);
      throw error;
    }
  };

  const saveFile = async (
    filePath: string,
    content: string,
    frontmatter?: Record<string, any>
  ) => {
    try {
      // Serialize content with frontmatter if it exists
      const finalContent = frontmatter
        ? serializeFrontmatter(content, frontmatter)
        : content;

      await invoke('write_file_content', {
        path: filePath,
        content: finalContent,
      });

      return true;
    } catch (error) {
      console.error('Failed to save file:', error);
      throw error;
    }
  };

  const readFile = async (filePath: string): Promise<string> => {
    try {
      const content = await invoke<string>('read_file_content', {
        path: filePath,
      });

      return content;
    } catch (error) {
      console.error('Failed to read file:', error);
      throw error;
    }
  };

  const newFile = () => {
    const timestamp = Date.now();
    const newTabId = `untitled-${timestamp}`;

    openTab({
      id: newTabId,
      filePath: '', // Empty path means unsaved file
      fileName: 'Untitled.md',
      content: '',
      isDirty: false,
      frontmatter: undefined,
    });
  };

  const saveFileAs = async (content: string, frontmatter?: Record<string, any>) => {
    try {
      const selected = await open({
        directory: false,
        multiple: false,
        filters: [
          {
            name: 'Markdown',
            extensions: ['md', 'markdown'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') {
        return null;
      }

      const finalContent = frontmatter
        ? serializeFrontmatter(content, frontmatter)
        : content;

      await invoke('write_file_content', {
        path: selected,
        content: finalContent,
      });

      const fileName = selected.split('/').pop() || selected.split('\\').pop() || 'Untitled.md';

      return { path: selected, fileName };
    } catch (error) {
      console.error('Failed to save file as:', error);
      throw error;
    }
  };

  return {
    openFolder,
    openFile,
    saveFile,
    saveFileAs,
    readFile,
    newFile,
  };
};
