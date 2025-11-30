import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";   // your fully self-contained file
import "./index.css"

// ---- NOTHING ELSE HERE ----
// No Zustand
// No WS logic
// No device store
// No call store
// All logic is inside index.jsx

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
