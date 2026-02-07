// Prism must load before @lexical/code (which imports prism-objectivec)
import "./lib/prismSetup";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { initSettings } from "./utils/settings";
import { initAutosave } from "./utils/autosave";
import { setupAutosaveSubscription } from "./stores/autosaveSubscription";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Initialize settings and autosave from persistent store
void initSettings();
void initAutosave();

// Start autosave subscription
setupAutosaveSubscription();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
