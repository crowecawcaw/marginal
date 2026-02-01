// Prism setup - must be imported before any code that uses @lexical/code
// This ensures prism-c is loaded before prism-objectivec (which Lexical imports internally)

import Prism from "prismjs";

// Core languages (order matters for dependencies)
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-c"; // Must be before objectivec, cpp
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-python";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-diff";

// Languages available for lazy loading
export const lazyLanguages: Record<string, string> = {
  csharp: "csharp",
  cs: "csharp",
  ruby: "ruby",
  rb: "ruby",
  php: "php",
  swift: "swift",
  kotlin: "kotlin",
  kt: "kotlin",
  scala: "scala",
  haskell: "haskell",
  hs: "haskell",
  elixir: "elixir",
  ex: "elixir",
  clojure: "clojure",
  clj: "clojure",
  lua: "lua",
  r: "r",
  julia: "julia",
  jl: "julia",
  latex: "latex",
  tex: "latex",
  makefile: "makefile",
  make: "makefile",
  docker: "docker",
  dockerfile: "docker",
  nginx: "nginx",
  graphql: "graphql",
  gql: "graphql",
  toml: "toml",
  shell: "shell-session",
  sh: "bash",
  zsh: "bash",
};

const loadingLanguages = new Set<string>();
const failedLanguages = new Set<string>();

// Lazy load a Prism language with error handling
export async function loadPrismLanguage(lang: string): Promise<boolean> {
  const normalizedLang = lang.toLowerCase();

  // Already loaded in Prism
  if (Prism.languages[normalizedLang]) {
    return true;
  }

  // Check if it's a lazy-loadable language
  const componentName = lazyLanguages[normalizedLang];
  if (!componentName) {
    return false;
  }

  // Already failed to load
  if (failedLanguages.has(componentName)) {
    return false;
  }

  // Currently loading
  if (loadingLanguages.has(componentName)) {
    return false;
  }

  loadingLanguages.add(componentName);

  try {
    await import(
      /* @vite-ignore */ `prismjs/components/prism-${componentName}.js`
    );
    loadingLanguages.delete(componentName);
    return true;
  } catch (error) {
    console.warn(`Failed to load Prism language: ${componentName}`, error);
    loadingLanguages.delete(componentName);
    failedLanguages.add(componentName);
    return false;
  }
}

export { Prism };
