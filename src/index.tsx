import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Dark-only design: shadcn's dark variants need the class even though the
// tokens themselves live on :root.
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
