/// <reference types="vite/client" />
import { Suspense } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

function getWindowLabel(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (window as any).__TAURI_INTERNALS__?.metadata?.currentWindow?.label ?? "";
  } catch {
    return "";
  }
}

const label = getWindowLabel();

// Eager imports — all windows are hidden on startup anyway,
// so no extra cost. Lazy loading caused a blank flash before Suspense resolved.
import Overlay  from "./windows/overlay/Overlay";
import Settings from "./windows/settings/Settings";
import Guide    from "./windows/guide/Guide";

// Dynamic fallback background to prevent flashes while matching window transparency
const Fallback = () => (
  <div style={{ width: '100vw', height: '100vh', background: label === 'overlay' ? 'transparent' : 'var(--clr-surface)' }} />
);

function App() {
  if (label === "overlay")  return <Overlay />;
  if (label === "settings") return <Settings />;
  if (label === "guide")    return <Guide />;
  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<Fallback />}>
    <App />
  </Suspense>
);
