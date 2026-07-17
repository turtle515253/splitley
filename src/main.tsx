import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { setupNetworkStatus } from "./lib/networkStatus";
import "./index.css";

setupNetworkStatus();

createRoot(document.getElementById("root")!).render(<App />);
