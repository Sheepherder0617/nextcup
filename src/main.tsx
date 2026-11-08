import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Per-device theme preference (System / Light / Dark), set on the Profile › Privacy tab.
try {
  const t = localStorage.getItem("nextcup:theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch { /* storage unavailable */ }

createRoot(document.getElementById("root")!).render(<App />);
