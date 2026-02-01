import React from "react";
import { useUIStore } from "../../stores/uiStore";
import "./LoadingOverlay.css";

const LoadingOverlay: React.FC = () => {
  const { isLoading, loadingMessage } = useUIStore();

  if (!isLoading) return null;

  return (
    <div className="loading-overlay">
      <div className="loading-spinner"></div>
      {loadingMessage && (
        <div className="loading-message">{loadingMessage}</div>
      )}
    </div>
  );
};

export default LoadingOverlay;
