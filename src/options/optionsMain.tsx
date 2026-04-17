import React from "react";
import { createRoot } from "react-dom/client";
import "../styles/globals.css";
import { OptionsPage } from "./OptionsPage";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <OptionsPage />
    </React.StrictMode>,
  );
}
