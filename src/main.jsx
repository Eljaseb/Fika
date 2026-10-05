import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import CreatorStudio from "./CreatorStudio.jsx";
import "./styles.css";

const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <CreatorStudio /> : <App />}
  </React.StrictMode>
);
