import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Ensure the PWA service worker updates itself and doesn't keep serving old UI after refresh
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
});

createRoot(document.getElementById("root")!).render(<App />);
