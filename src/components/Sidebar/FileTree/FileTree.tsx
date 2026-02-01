import React, { useState } from "react";
import { FileNode } from "../../../types";
import "./FileTree.css";

interface FileTreeProps {
  nodes: FileNode[];
  onFileClick: (filePath: string) => void;
}

interface FileTreeNodeProps {
  node: FileNode;
  depth: number;
  onFileClick: (filePath: string) => void;
}

const FileTreeNode: React.FC<FileTreeNodeProps> = ({
  node,
  depth,
  onFileClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = () => {
    if (node.isDirectory) {
      setIsExpanded(!isExpanded);
    } else {
      onFileClick(node.path);
    }
  };

  const getIcon = () => {
    if (node.isDirectory) {
      return isExpanded ? "📂" : "📁";
    }
    if (node.name.endsWith(".md") || node.name.endsWith(".markdown")) {
      return "📝";
    }
    return "📄";
  };

  return (
    <div className="file-tree-node">
      <div
        className={`file-tree-item ${node.isDirectory ? "directory" : "file"}`}
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={handleClick}
      >
        <span className="file-tree-icon">{getIcon()}</span>
        <span className="file-tree-name">{node.name}</span>
      </div>
      {node.isDirectory && isExpanded && node.children && (
        <div className="file-tree-children">
          {node.children.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileTree: React.FC<FileTreeProps> = ({ nodes, onFileClick }) => {
  if (nodes.length === 0) {
    return (
      <div className="file-tree-empty">
        <p>No folder opened</p>
      </div>
    );
  }

  return (
    <div className="file-tree">
      {nodes.map((node) => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
};

export default FileTree;
