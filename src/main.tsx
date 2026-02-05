// Prism must load before @lexical/code (which imports prism-objectivec)
import "./lib/prismSetup";

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { initSettings } from "./utils/settings";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Initialize settings from persistent store
void initSettings();

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
