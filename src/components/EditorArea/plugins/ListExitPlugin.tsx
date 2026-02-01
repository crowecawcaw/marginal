import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  COMMAND_PRIORITY_HIGH,
  KEY_ENTER_COMMAND,
  KEY_BACKSPACE_COMMAND,
} from "lexical";
import { $isListItemNode, $isListNode, ListNode, ListItemNode } from "@lexical/list";

// Helper to check if we're in an empty list item and get the context
function getEmptyListItemContext() {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return null;
  }

  const anchorNode = selection.anchor.getNode();
  const listItemNode = anchorNode.getParent();

  if (!$isListItemNode(listItemNode)) {
    return null;
  }

  const textContent = listItemNode.getTextContent();
  if (textContent !== "") {
    return null;
  }

  const listNode = listItemNode.getParent();
  if (!$isListNode(listNode)) {
    return null;
  }

  return { listItemNode, listNode };
}

// Helper to exit list and clean up
function exitListItem(
  listItemNode: ListItemNode,
  listNode: ListNode,
  insertBefore: boolean
) {
  const paragraph = $createParagraphNode();

  if (insertBefore) {
    listNode.insertBefore(paragraph);
  } else {
    listNode.insertAfter(paragraph);
  }

  listItemNode.remove();

  if (listNode.getChildrenSize() === 0) {
    listNode.remove();
  }

  paragraph.selectStart();
}

// Plugin to handle list exit behavior (Enter twice or Backspace on empty bullet exits list)
export function ListExitPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Enter key - exit list if on empty list item
    const unregisterEnter = editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const context = getEmptyListItemContext();
        if (!context) {
          return false;
        }

        event?.preventDefault();
        exitListItem(context.listItemNode, context.listNode, false);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    // Handle Backspace key - exit list if on empty list item at start
    const unregisterBackspace = editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        // Only handle if cursor is at offset 0
        if (selection.anchor.offset !== 0) {
          return false;
        }

        const context = getEmptyListItemContext();
        if (!context) {
          return false;
        }

        event?.preventDefault();

        // Check if this is the first item in the list
        const previousSibling = context.listItemNode.getPreviousSibling();
        const insertBefore = previousSibling === null;

        exitListItem(context.listItemNode, context.listNode, insertBefore);
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );

    return () => {
      unregisterEnter();
      unregisterBackspace();
    };
  }, [editor]);

  return null;
}
