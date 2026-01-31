import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { useFileStore } from '../stores/fileStore';
import { useEditorStore } from '../stores/editorStore';
import { FileNode } from '../types';

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

      const content = await invoke<string>('read_file_content', {
        path,
      });

      const fileName = path.split('/').pop() || path.split('\\').pop() || 'Untitled';

      openTab({
        id: path,
        filePath: path,
        fileName,
        content,
        isDirty: false,
      });

      addRecentFile(path);
    } catch (error) {
      console.error('Failed to open file:', error);
      throw error;
    }
  };

  const saveFile = async (filePath: string, content: string) => {
    try {
      await invoke('write_file_content', {
        path: filePath,
        content,
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

  return {
    openFolder,
    openFile,
    saveFile,
    readFile,
  };
};
