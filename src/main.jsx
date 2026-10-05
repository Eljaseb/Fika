import React from "react";
import { createRoot } from "react-dom/client";
import PublicAppV2 from "./PublicAppV2.jsx";
import CreatorStudioV2 from "./CreatorStudioV2.jsx";
import "./styles.css";

const isAdmin = new URLSearchParams(window.location.search).get("admin") === "1";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAdmin ? <CreatorStudioV2 /> : <PublicAppV2 />}
  </React.StrictMode>
);
