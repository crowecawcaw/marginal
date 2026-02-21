import { useEffect } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $isTabNode,
  $createTabNode,
  $createLineBreakNode,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from "lexical";
import {
  $isCodeNode,
  $isCodeHighlightNode,
  $createCodeHighlightNode,
  getFirstCodeNodeOfLine,
  CodeHighlightNode,
} from "@lexical/code";

const OPEN_BRACKETS = new Set(["{", "[", "("]);

export function CodeIndentPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }

        const { anchor } = selection;
        const anchorNode = anchor.getNode();
        const offset = anchor.offset;

        if (!$isTextNode(anchorNode) || !$isCodeNode(anchorNode.getParent())) {
          return false;
        }

        // Check character before cursor
        let charBeforeCursor: string | undefined;
        if (offset > 0) {
          charBeforeCursor = anchorNode.getTextContent()[offset - 1];
        } else {
          const prev = anchorNode.getPreviousSibling();
          if (prev && $isTextNode(prev)) {
            const prevText = prev.getTextContent();
            charBeforeCursor = prevText[prevText.length - 1];
          }
        }

        if (!charBeforeCursor || !OPEN_BRACKETS.has(charBeforeCursor)) {
          return false;
        }

        event?.preventDefault();

        // Collect current line's indentation (same logic as CodeNode.insertNewAfter)
        let node = getFirstCodeNodeOfLine(anchorNode as CodeHighlightNode);
        const indentNodes = [];

        while (node !== null) {
          if ($isTabNode(node)) {
            indentNodes.push($createTabNode());
            node = node.getNextSibling();
          } else if ($isCodeHighlightNode(node)) {
            let spaces = 0;
            const nodeText = node.getTextContent();
            const textSize = node.getTextContentSize();
            while (spaces < textSize && nodeText[spaces] === " ") {
              spaces++;
            }
            if (spaces !== 0) {
              indentNodes.push($createCodeHighlightNode(" ".repeat(spaces)));
            }
            if (spaces !== textSize) {
              break;
            }
            node = node.getNextSibling();
          } else {
            break;
          }
        }

        // Add one extra tab for bracket-aware indent
        indentNodes.push($createTabNode());

        // Split text at cursor and splice new line with indent
        const split = anchorNode.splitText(offset)[0];
        const x = offset === 0 ? 0 : 1;
        const index = split.getIndexWithinParent() + x;
        const codeNode = anchorNode.getParentOrThrow();
        codeNode.splice(index, 0, [$createLineBreakNode(), ...indentNodes]);

        // Place cursor after last indent node
        indentNodes[indentNodes.length - 1].select();

        return true;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  return null;
}
