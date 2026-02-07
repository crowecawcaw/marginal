import { useEffect, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isLinkNode, LinkNode, $toggleLink } from "@lexical/link";
import {
  $getNodeByKey,
  $createRangeSelection,
  $setSelection,
} from "lexical";
import { LinkEditTooltip } from "../LinkEditTooltip";

interface ActiveLink {
  nodeKey: string;
  url: string;
  rect: DOMRect;
}

export function LinkEditPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);

  // Find the LinkNode for a given DOM element
  const findLinkNode = useCallback(
    (element: HTMLElement): { node: LinkNode; element: HTMLElement } | null => {
      const linkElement = element.closest(
        "a.editor-link"
      ) as HTMLElement | null;
      if (!linkElement) return null;

      let foundLink: { node: LinkNode; element: HTMLElement } | null = null;

      editor.getEditorState().read(() => {
        const editorElement = editor.getRootElement();
        if (!editorElement) return;

        // Walk through all link nodes to find the matching one
        const nodeMap = editor.getEditorState()._nodeMap;
        for (const [key, node] of nodeMap) {
          if ($isLinkNode(node)) {
            const dom = editor.getElementByKey(key);
            if (dom === linkElement) {
              foundLink = { node: node as LinkNode, element: linkElement };
              break;
            }
          }
        }
      });

      return foundLink;
    },
    [editor]
  );

  // Handle clicks on links
  useEffect(() => {
    const rootElement = editor.getRootElement();
    if (!rootElement) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const linkResult = findLinkNode(target);

      if (!linkResult) {
        // Clicked outside a link — dismiss tooltip
        setActiveLink(null);
        return;
      }

      const { node, element } = linkResult;

      // Cmd+Click (Mac) or Ctrl+Click (Win/Linux) → open the URL
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        event.stopPropagation();
        const url = node.__url;
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
        return;
      }

      // Regular click → open edit tooltip
      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();

      editor.getEditorState().read(() => {
        setActiveLink({
          nodeKey: node.getKey(),
          url: node.__url,
          rect,
        });
      });
    };

    rootElement.addEventListener("click", handleClick);
    return () => {
      rootElement.removeEventListener("click", handleClick);
    };
  }, [editor, findLinkNode]);

  // Dismiss on scroll
  useEffect(() => {
    if (!activeLink) return;

    const rootElement = editor.getRootElement();
    const scrollParent = rootElement?.closest(".markdown-editor-input");
    if (!scrollParent) return;

    const handleScroll = () => setActiveLink(null);
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, [activeLink, editor]);

  const handleUrlChange = useCallback(
    (newUrl: string) => {
      if (!activeLink) return;

      editor.update(() => {
        const node = $getNodeByKey(activeLink.nodeKey);
        if ($isLinkNode(node)) {
          node.setURL(newUrl);
        }
      });
      setActiveLink(null);
    },
    [activeLink, editor]
  );

  const handleRemoveLink = useCallback(() => {
    if (!activeLink) return;

    editor.update(() => {
      const node = $getNodeByKey(activeLink.nodeKey);
      if ($isLinkNode(node)) {
        // Select all children of the link, then toggle link off
        const children = node.getChildren();
        if (children.length > 0) {
          const firstChild = children[0];
          const lastChild = children[children.length - 1];
          const selection = $createRangeSelection();
          selection.anchor.set(firstChild.getKey(), 0, "text");
          selection.focus.set(
            lastChild.getKey(),
            lastChild.getTextContentSize(),
            "text"
          );
          $setSelection(selection);
          $toggleLink(null);
        }
      }
    });
    setActiveLink(null);
  }, [activeLink, editor]);

  const handleOpenLink = useCallback(() => {
    if (!activeLink) return;
    window.open(activeLink.url, "_blank", "noopener,noreferrer");
    setActiveLink(null);
  }, [activeLink]);

  const handleClose = useCallback(() => {
    setActiveLink(null);
  }, []);

  if (!activeLink) return null;

  return (
    <LinkEditTooltip
      url={activeLink.url}
      rect={activeLink.rect}
      onUrlChange={handleUrlChange}
      onRemoveLink={handleRemoveLink}
      onOpenLink={handleOpenLink}
      onClose={handleClose}
    />
  );
}
