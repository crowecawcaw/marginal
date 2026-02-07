import { useEffect, useState, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $isLinkNode, LinkNode, $toggleLink } from "@lexical/link";
import {
  $getNodeByKey,
  $createRangeSelection,
  $setSelection,
} from "lexical";
import { LinkEditTooltip } from "../LinkEditTooltip";
import { openUrl } from "@tauri-apps/plugin-opener";

interface ActiveLink {
  nodeKey: string;
  url: string;
  rect: DOMRect;
}

interface FoundLink {
  nodeKey: string;
  url: string;
  element: HTMLElement;
}

export function LinkEditPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeLink, setActiveLink] = useState<ActiveLink | null>(null);

  // Find the LinkNode for a given DOM element
  const findLinkNode = useCallback(
    (element: HTMLElement): FoundLink | null => {
      const linkElement = element.closest(
        "a.editor-link"
      ) as HTMLElement | null;
      if (!linkElement) return null;

      let foundLink: FoundLink | null = null;

      editor.getEditorState().read(() => {
        const editorElement = editor.getRootElement();
        if (!editorElement) return;

        // Walk through all link nodes to find the matching one
        const nodeMap = editor.getEditorState()._nodeMap;
        for (const [key, node] of nodeMap) {
          if ($isLinkNode(node)) {
            const dom = editor.getElementByKey(key);
            if (dom === linkElement) {
              foundLink = { nodeKey: key, url: (node as LinkNode).getURL(), element: linkElement };
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

    const handleMouseDown = (event: MouseEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;

      const target = event.target as HTMLElement;
      const linkElement = target.closest("a.editor-link") as HTMLElement | null;
      if (!linkElement) return;

      const href = linkElement.getAttribute("href");
      if (!href) return;

      event.preventDefault();
      event.stopPropagation();
      openUrl(href);
    };

    const handleClick = (event: MouseEvent) => {
      // Ignore cmd/ctrl clicks — handled by mousedown
      if (event.metaKey || event.ctrlKey) return;

      const target = event.target as HTMLElement;
      const linkResult = findLinkNode(target);

      if (!linkResult) {
        // Clicked outside a link — dismiss tooltip
        setActiveLink(null);
        return;
      }

      const { nodeKey, url, element } = linkResult;

      // Regular click → open edit tooltip
      event.preventDefault();
      event.stopPropagation();

      const rect = element.getBoundingClientRect();

      setActiveLink({ nodeKey, url, rect });
    };

    rootElement.addEventListener("mousedown", handleMouseDown);
    rootElement.addEventListener("click", handleClick);
    return () => {
      rootElement.removeEventListener("mousedown", handleMouseDown);
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
    openUrl(activeLink.url);
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
