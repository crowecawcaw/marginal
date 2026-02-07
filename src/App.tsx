import React, { useEffect } from "react";
import Layout from "./components/Layout/Layout";
import { useUIStore } from "./stores/uiStore";

const App: React.FC = () => {
  const theme = useUIStore((s) => s.theme);

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return <Layout />;
};

export default App;
