import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css";
import "../styles/letter-document.css";
import { SidePanelRoot } from "./SidePanelRoot";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <SidePanelRoot />
    </React.StrictMode>,
  );
}
